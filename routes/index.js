const express = require('express');
const router = express.Router();
const passport = require('passport');
const { check, validationResult } =  require('express-validator');
const bcrypt = require('bcryptjs');
const auth = require('../middlewares/auth');
const Users = require('../models/users');

const baseUrl = process.env.BASE_URL || '';

router.get('/', auth.checkNotAuth, function(req, res) {
    res.render('index', {page: 'home'});
});

router.get('/login', auth.checkNotAuth, function(req, res) {
    res.render('index', {page: 'login', message: req.flash('error')});
});

router.post('/login', function(req, res, next) {
    if(req.body.email && req.body.password) {
        passport.authenticate('local', {
            successRedirect: baseUrl+'/app/overview',
            failureRedirect: baseUrl+'/login',
            failureFlash: true
        })(req, res, next);
    } else {
        res.render('index', {page: 'login', message: 'Wypelnij wszystkie pola'});
    }
});

router.get('/register', auth.checkNotAuth, function(req, res) {
    res.render('index', {page: 'register'});
});

router.post('/register', [
        check('firstname').exists()
        .isLength({min: 3, max: 12}).withMessage('Imię musi mieć od 3 do 12 znaków')
        .matches('^[a-zA-Z]+$', 'i').withMessage('Imię zawiera niedozwolone znaki'),
        check('lastname').exists()
        .isLength({min: 3, max: 12}).withMessage('Nazwisko musi mieć od 3 do 12 znaków')
        .matches('^[a-zA-Z]+$', 'i').withMessage('Nazwisko zawiera niedozwolone znaki'),
        check('email').exists().isEmail().withMessage('Nieprawidłowy email'),
        check('password').exists().isLength({min: 8, max: 30}).withMessage('Hasło musi mieć od 8 do 30 znaków')
        .matches('^(?=.*[A-Za-z])(?=.*[0-9]).+$').withMessage('Hasło musi zawierać minimum jedną literę i cyfrę')
        .matches('^[A-Za-z0-9@$!%*#?&+=<>:;\._^{}()]+$').withMessage('Hasło może zawierać znaki: A-Za-z0-9@$!%*#?&+=<>:;._^{}()')
        .custom((value, {req, loc, path}) => {
            if(value != req.body.passwordRepeat) {
                throw new Error('Podane hasła nie są takie same');
            } else {
                return value;
            }
        })
    ], function(req, res, next) {
    const { firstname, lastname, email, password, passwordRepeat } = req.body;
    if(!firstname || !lastname || !email || !password || !passwordRepeat ) {
        res.render('index', {page: 'register', error: {msg: 'Wypełnij wszystkie pola'}, values: req.body});
    } else {
        const errors = validationResult(req);

        if(!errors.isEmpty()) {
            res.render('index', {page: 'register', error: errors.array()[0], values: req.body});
        } else {
            Users.findOne({email: email}, (err, user) => {
                if(user) {
                    res.render('index', {page: 'register', error: {msg: 'Użytkownika o podanym adresie email już istnieje'}, values: req.body});
                } else {
                    const newUser = new Users({
                        firstname,
                        lastname,
                        email,
                        password
                    });
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newUser.password, salt, (err, hash) => {
                            if(err) throw err;
                            newUser.password = hash;
                            newUser.save((err, user) => {
                                if(err) console.log(err);
                                res.redirect(baseUrl+'/login');
                            });
                        });
                    });
                }
            });
        }
    }
});

router.get('/logout', function(req, res) {
    req.logOut();
    res.redirect(baseUrl+'/');
});

module.exports = router;