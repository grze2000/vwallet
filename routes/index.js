const express = require('express');
const router = express.Router();
const passport = require('passport');
const auth = require('../middlewares/auth');

router.get('/', function(req, res) {
	res.render('index');
});

router.get('/login', auth.checkNotAuth, function(req, res) {
	res.render('login', {message: req.flash('error')});
});

router.post('/login', function(req, res, next) {
	if(req.body.email && req.body.password) {
		passport.authenticate('local', {
			successRedirect: '/app/dashboard',
			failureRedirect: '/login',
			failureFlash: true
		})(req, res, next);
	} else {
		res.render('login', {message: 'Wypelnij wszystkie pola'});
	}
});

router.get('/register', auth.checkNotAuth, function(req, res) {
	res.render('register');
});

router.post('/register', function(req, res, next) {
	if(req.body.firstname && req.body.lastname && req.body.email && req.body.password && req.body.password-repeat) {

	} else {
		res.render('register', {message: 'Wypełnij wszystkie pola'});
	}
});

router.get('/logout', function(req, res) {
	req.logOut();
	res.redirect('/');
});

module.exports = router;