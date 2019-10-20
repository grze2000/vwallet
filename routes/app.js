const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Users = require('../models/users');
const Coupons = require('../models/coupons');
const Transactions = require('../models/transactions');

const find = function(q, dict) {
    for(const [key, value] of Object.entries(dict)) {
        if(value._id == q) {
            return value.balance;
        }
    }
    return 0;
}

router.get('/overview', auth.checkAuth, (req, res) => {
    const date = new Date();
    Transactions.aggregate([
        {$match: {$or: [
                {"recipient": req.user._id},
                {"sender": req.user._id}
            ]}
        },
        {$group: {
            _id: {$month: '$createdAt'},
            balance: {$sum: {$multiply: [
                '$amount', {$cond: [
                    {$eq: [
                        "$recipient",
                        req.user._id
                    ]}, 1, -1
                ]}
            ]}},
            expenses: {$sum: {$cond: [
                {$eq: [
                    "$sender",
                    req.user._id
                ]}, "$amount", 0
            ]}}

            }
        },
        {$group: {
            _id: 1,
            data: {$push: {
                _id: "$_id",
                balance: "$balance"
            }},
            exp: {$push: "$expenses"}
        }},
        {$project: {
            data: 1,
            expenses: {
                min: {$min: "$exp"},
                avg: {$avg: "$exp"},
                max: {$max: "$exp"}
            }
        }}
    ]).exec((err, tr) => {
        Transactions.find({$or: [{recipient: req.user._id}, {sender: req.user._id}]}).populate('recipient').populate('sender').sort({createdAt: 'desc'}).limit(5).exec((err, userTransactions) => {
            Transactions.aggregate([
                {$facet: {
                    senders: [
                        {$match: {
                            "recipient": req.user._id
                        }},
                        {$group: {
                            _id: "$recipient",
                            arr: {$addToSet: "$sender"}
                        }},
                        {$lookup: {
                            from: 'users',
                            localField: 'arr',
                            foreignField: '_id',
                            as: 'list'
                        }},
                        {$project: {
                            _id: 0,
                            list: 1
                        }}
                    ],
                    recipients: [
                        {$match: {
                            "sender": req.user._id
                        }},
                        {$group: {
                            _id: "$sender",
                            arr: {$addToSet: "$recipient"}
                        }},
                        {$lookup: {
                            from: 'users',
                            localField: 'arr',
                            foreignField: '_id',
                            as: 'list'
                        }},
                        {$project: {
                            _id: 0,
                            list: 1
                        }}
                    ]
                }}
            ]).exec((err, people) => {
                console.log(people[0].senders[0].list);
                const data = tr.length > 0 ? tr[0].data : {};
                const expenses = tr.length > 0 ? tr[0].expenses : {min: 0, avg: 0, max: 0};
                const months = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
                const start = date.getMonth() >= 6 ? date.getMonth()-5 : 7+date.getMonth();
                let values = [];
                let colors = [];
                if(start > date.getMonth()) {
                    for(let i=start; i<12; i++) {
                        values.push(find(i+1, data));
                    }
                    for(let i=0; i<=date.getMonth(); i++) {
                        values.push(find(i+1, data));
                    }
                } else {
                    for(let i=start; i<=date.getMonth(); i++) {
                        values.push(find(i+1, data));
                    }
                }
                for(let value of values) {
                    colors.push(value >= 0 ? 'rgb(100, 255, 132)' : 'rgb(255, 99, 132)');
                }
                const chartData = {
                    labels: start > date.getMonth() ? months.slice(start, months.length).concat(months.slice(0, date.getMonth()+1)) : months.slice(start, date.getMonth()+1),
                    datasets: [{
                        label: 'saldo [zł]',
                        backgroundColor: colors,
                        data: values
                    }]
                };
                res.render('app', {user: req.user, page: 'overview', chartData: chartData, expenses: expenses, transactions: JSON.stringify(userTransactions), people: people});
            });
        });
    });
});

router.get('/payments', auth.checkAuth, (req, res) => {
    Transactions.find({$or: [{recipient: req.user._id}, {sender: req.user._id}]}).populate('recipient').populate('sender').sort({createdAt: 'desc'}).exec((err, userTransactions) => {
        res.render('app', {user: req.user, page: 'payments', transactions: JSON.stringify(userTransactions)});
    });
});

router.get('/topup', auth.checkAuth, (req, res) => {
    res.render('app', {user: req.user, page: 'topup'});
});

router.get('/coupon', auth.checkAuth, (req, res) => {
    res.render('app', {user: req.user, page: 'coupon'});
});

router.post('/coupon', auth.checkAuth, (req, res) => {
    if(req.body.code) {
        req.body.code = req.body.code.toUpperCase();
        Coupons.findOne({code: req.body.code}, (err, coupon) => {
            if(err) console.log(err);
            if(coupon) {
                if(coupon.useDate == undefined) {
                    req.user.balance += coupon.amount;
                    req.user.save();
                    coupon.useDate = new Date();
                    coupon.save();
                    let transaction = new Transactions({type: 'coupon', amount: coupon.amount, couponCode: coupon.code, recipient: req.user._id});
                    transaction.save();
                    res.render('app', {user: req.user, page: 'coupon', message: `Zrealizowano kupon ${coupon.code}. Kwota doładowania: ${coupon.amount} zł`});
                } else {
                    res.render('app', {user: req.user, page: 'coupon', message: `Ten kupon został już wykorzystany`});
                }
                
            } else {
                res.render('app', {user: req.user, page: 'coupon', message: 'Nieprawidłowy kupon'});
            }
        });
    } else {
        res.render('app', {user: req.user, page: 'coupon', message: 'Podaj kupon'});
    }
});

router.post('/transfer', auth.checkAuth, (req, res) => {
    Transactions.find({$or: [{recipient: req.user._id}, {sender: req.user._id}]}).sort({createdAt: 'desc'}).exec((err, userTransactions) => {
        if(req.body.email && req.body.amount) {
            const amount = parseFloat(req.body.amount);
            Users.findOne({email: req.body.email}, (err, user) => {
            if(user) {
                if(req.body.email != req.user.email) {
                    if(amount > 0 && amount <= req.user.balance) {
                        req.user.balance -= amount;
                        user.balance += amount;
                        req.user.save();
                        user.save();
                        let transaction = new Transactions({
                            type: 'transfer',
                            amount: amount,
                            sender: req.user._id,
                            recipient: user._id,
                            description: req.body.description
                        });
                        transaction.save();
                        res.redirect('back');
                    } else {
                        res.render('app', {user: req.user, page: 'payments', message: 'Nie masz wystarczających środków na koncie', transactions: JSON.stringify(userTransactions)});
                    }
                } else {
                    res.render('app', {user: req.user, page: 'payments', message: 'Podany email jest przypisany do Twojego konta', transactions: JSON.stringify(userTransactions)});
                }
            } else {
                res.render('app', {user: req.user, page: 'payments', message: 'Użytkownik o takim adresie email nie istnieje', transactions: JSON.stringify(userTransactions)});
            }
        });
        } else {
            res.render('app', {user: req.user, page: 'payments', message: 'Wypełnij wymagane pola', transactions: JSON.stringify(userTransactions)});
        }
    });
});

module.exports = router;