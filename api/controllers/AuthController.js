/*---------------------
	:: Auth 
	-> controller
---------------------*/
var passwordHash = require('password-hash'),
    subController = require('./SubscriptionController');
var AuthController = {

    signup: function (req, res) {
        var email = req.param('email')
        var pass = req.param('pass')
        var pass2 = req.param('pass2')

        if (!email || !pass) {
            return res.json({
                err: 'email or password not specified'
            })
        } else if (pass!==pass2){
            return res.json({
                err: 'passwords do not match'
            })
        } else {
            User.find({
                email: email
            }).then(function (user) {
                return res.json({
                    err: 'user exists'
                })
            }).fail(function (e) {
                //create new user
                Subscription.create({
                    feeds: [],
                    unread: []
                }).then(function (sub) {
                    var user = {
                        email: email,
                        pass: passwordHash.generate(pass),
                        subscription: sub.id
                    }
                    User.create(user).then(function (user) {
                        req.session.authenticated = true
                        req.session.user = user
                        req.session.sub = user.subscription
                        
                        // default user to hacker news sub
                        subController.subscribeFeed('http://feeds.feedburner.com/newsyc100', '__main__', req.session.sub, function (err, sub) {
                            if (err) {
                                console.log('error subscribing', err)
                            }
                            return res.json({success: true})
                        })
                    })
                }).fail(function (e) {
                    return res.json({
                        err: 'error creating user'
                    })
                })
            })

        }
    },

    logout: function (req, res) {
        req.session.authenticated = false
        req.session.user = null
        req.session.subId = null

        res.json({})
    },

    login: function (req, res) {
        if (req.method === "GET") return res.json({
            err: 'cannot login with GET'
        })
        var email = req.param('email')
        var pass = req.param('pass')

        if (!email || !pass) {
            return res.json({
                err: 'email or password not specified'
            })
        }

        User.find({
            email: email
        }).then(function (user) {
            if (passwordHash.verify(pass, user.pass)) {
                req.session.authenticated = true
                req.session.user = user
                req.session.sub = user.subscription
                return res.json({
                    success: true
                })
            } else {
                return res.json({
                    err: 'incorrect email or password'
                })
            }
        }).fail(function (e) {
            return res.json({
                err: 'incorrect email or password'
            })
        })

    }

};
module.exports = AuthController;