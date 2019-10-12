const Strategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Users = require('../models/users');

module.exports = function(passport) {
    passport.use(new Strategy({usernameField: 'email'}, (email, password, done) => {
        Users.findOne({ email : email }, (err, user) => {
            if(!user) {
                return done(null, false, { message: 'Nieprawidłowy adres email!' });
            }
            bcrypt.compare(password, user.password,(err, res) => {
                if(res == false) {
                    return done(null, false, {message: 'Nieprawidłowe hasło!'});
                } else {
                    return done(null, user);
                }
            });
        });
    }));

    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
        Users.findById(id, (err, user) => {
            done(err, user);
        });
    })
}