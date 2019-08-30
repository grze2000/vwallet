require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const routes = require('./routes/index');
const appRoutes = require('./routes/app');
const errorsHandler = require('./middlewares/errors');

require('./config/passport')(passport);

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true}, (err) => {
	if(err) throw err;
	console.log('Conected to database');
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
	secret: 'tesseract',
	resave: true,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use('/', routes);
app.use('/app', appRoutes);

app.use(errorsHandler.notFound);
app.use(errorsHandler.catchErrors);

app.listen(3000, function() {
	console.log('Lisening on 3000');
});