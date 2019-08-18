const express = require('express');
const router = express.Router();
const passport = require('passport');
const auth = require('../middlewares/auth');

router.get('/dashboard', auth.checkAuth, (req, res) => {
	res.render('dashboard', req.user);
});

module.exports = router;