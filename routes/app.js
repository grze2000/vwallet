const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Users = require('../models/users');
const Coupons = require('../models/coupons');
const Transactions = require('../models/transactions');

router.get('/overview', auth.checkAuth, (req, res) => {
	res.render('app', {user: req.user, page: 'overview'});
});

router.get('/payments', auth.checkAuth, (req, res) => {
	Transactions.find({$or: [{recipient: req.user.ObjectId}, {sender: req.user.ObjectId}]}).sort({createdAt: 'desc'}).exec((err, userTransactions) => {
		console.log(userTransactions, req.user);
		res.render('app', {user: req.user, page: 'payments', transactions: userTransactions});
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
	Transactions.find({$or: [{recipient: req.user.ObjectId}, {sender: req.user.ObjectId}]}).sort({createdAt: 'desc'}).exec((err, userTransactions) => {
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
							recipient: user._id
						});
						transaction.save();
						res.render('app', {user: req.user, page: 'payments', transactions: userTransactions});
					} else {
						res.render('app', {user: req.user, page: 'payments', tab: 2, message: 'Nie masz wystarczających środków na koncie', transactions: userTransactions});
					}
				} else {
					res.render('app', {user: req.user, page: 'payments', tab: 2, message: 'Podany email jest przypisany do Twojego konta', transactions: userTransactions});
				}
			} else {
				res.render('app', {user: req.user, page: 'payments', tab: 2, message: 'Użytkownik o takim adresie email nie istnieje', transactions: userTransactions});
			}
		});
		} else {
			res.render('app', {user: req.user, page: 'payments', tab: 2, message: 'Wypelnij wszystkie pola', transactions: userTransactions});
		}
	});
});

module.exports = router;