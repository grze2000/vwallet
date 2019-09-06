const express = require('express');
const router = express.Router();
const passport = require('passport');
const auth = require('../middlewares/auth');

router.get('/overview', auth.checkAuth, (req, res) => {
	res.render('app', {user: req.user, page: 'overview'});
});

router.get('/payments', auth.checkAuth, (req, res) => {
	res.render('app', {user: req.user, page: 'payments'});
});

router.get('/topup', auth.checkAuth, (req, res) => {
	res.render('app', {user: req.user, page: 'topup'});
});

module.exports = router;