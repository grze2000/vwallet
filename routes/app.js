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
        {$facet: {
            expenses: [
                {$addFields: {"year": {$year: '$createdAt'}}},
                {$match: {$and: [
                        {$or: [
                            {"recipient": req.user._id},
                            {"sender": req.user._id}
                        ]},
                        {
                            "year": new Date().getFullYear()
                        }
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
                }},
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
            ],
            actualMonthExpences: [
                {$addFields: {
                    month: {$month: "$createdAt"},
                    year: {$year: "$createdAt"}
                }},
                {$match: {
                    "sender": req.user._id,
                    "month": date.getMonth()+1,
                    "year": date.getFullYear()
                }},
                {$group: {
                    _id: 1,
                    expenses: {$push: "$amount"},
                    count: {$sum: 1}
                }},
                {$project: {
                    _id: 0,
                    value: {$sum: "$expenses"},
                    count: 1
                }}
            ],
            actualMonthRevenues: [
                {$addFields: {
                    month: {$month: "$createdAt"},
                    year: {$year: "$createdAt"}
                }},
                {$match: {
                    "recipient": req.user._id,
                    "month": date.getMonth()+1,
                    "year": date.getFullYear()
                }},
                {$group: {
                    _id: 1,
                    revenues: {$push: "$amount"},
                    count: {$sum: 1}
                }},
                {$project: {
                    _id: 0,
                    value: {$sum: "$revenues"},
                    count: 1
                }}
            ]
        }}
    ]).exec((err, stats) => {
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
                let peopleArr = [];
                if(people[0].senders.length > 0 && people[0].recipients.length > 0) {
                    peopleArr = people[0].senders[0].list.concat(people[0].recipients[0].list);
                    for(let i=0; i<peopleArr.length; i++) {
                        for(let j=i+1; j<peopleArr.length; j++) {
                            if(peopleArr[i]._id.toString() == peopleArr[j]._id.toString()) {
                                peopleArr.splice(j--, 1);
                            }
                        }
                    }
                }
                const stats2 = {
                  expenses: stats[0].expenses.length > 0 ? stats[0].expenses[0].expenses : {min: 0, avg: 0, max: 0},
                  actualMonthExpences: stats[0].actualMonthExpences.length > 0 ? stats[0].actualMonthExpences[0] : {count: 0, value: 0},
                  actualMonthRevenues: stats[0].actualMonthRevenues.length > 0 ? stats[0].actualMonthRevenues[0] : {count: 0, value: 0}
                };
                
                const data = stats[0].expenses.length > 0 ? stats[0].expenses[0].data : {};
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
                    colors.push(value >= 0 ? 'rgb(50, 168, 82)' : 'rgb(226, 13, 5)');
                }
                const chartData = {
                    labels: start > date.getMonth() ? months.slice(start, months.length).concat(months.slice(0, date.getMonth()+1)) : months.slice(start, date.getMonth()+1),
                    datasets: [{
                        label: 'saldo [zł]',
                        backgroundColor: colors,
                        data: values
                    }]
                };
                res.render('app', {user: req.user, page: 'overview', chartData: chartData, stats: stats2, transactions: JSON.stringify(userTransactions), people: peopleArr});
            });
        });
    });
});

router.get('/payments', auth.checkAuth, (req, res) => {
    Transactions.find({$or: [{recipient: req.user._id}, {sender: req.user._id}]}).populate('recipient').populate('sender').sort({createdAt: 'desc'}).exec((err, userTransactions) => {
        res.render('app', {user: req.user, page: 'payments', transactions: JSON.stringify(userTransactions), recipient: (typeof(req.query.recipient) != 'undefined' ? req.query.recipient : false)});
    });
});

router.get('/topup', auth.checkAuth, (req, res) => {
    res.render('app', {user: req.user, page: 'topup'});
});

router.get('/coupon', auth.checkAuth, (req, res) => {
    res.render('app', {user: req.user, page: 'coupon'});
});

router.get('/addcard', auth.checkAuth, (req, res) => {
    res.render('app', {user: req.user, page: 'addcard'});
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

router.post('/addcard', auth.checkAuth, (req, res) => {
    if(!/^(?:[0-9]{4}-){3}[0-9]{4}$/.test(req.body.card)) {
        res.render('app', {user: req.user, page: 'addcard', message: 'Podaj prawidłowy numer karty kredytowej', values: req.body});
    } else if(!/^0[1-9]|1[0-2]\/[0-9]{2}$/.test(req.body.expirationDate)) {
        res.render('app', {user: req.user, page: 'addcard', message: 'Podaj prawidłową datę ważności', values: req.body});
    } else if(!/^[0-9]{3}$/.test(req.body.cvv)) {
        res.render('app', {user: req.user, page: 'addcard', message: 'Podaj prawidłowy kod CVV', values: req.body});
    } else {
        // TODO: Add card to database
        res.render('app', {user: req.user, page: 'addcard', message: 'Nie można powiązać karty z kontem'});
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