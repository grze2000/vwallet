exports.checkAuth = (req, res, next) => {
    if(req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/login');
    }
}

exports.checkNotAuth = (req, res, next) => {
    if(req.isAuthenticated()) {
        res.redirect('/app/overview');
    } else {
        next();
    }
}