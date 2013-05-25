/*---------------------
	:: User 
	-> controller
---------------------*/
var UserController = {

    index: function (req, res) {
        User.findAll(function (req, users) {
            res.json(users)
        })
    },

    create: function (req, res) {
        var email = req.param('email', '')
        var pass = req.param('pass', '')

        User.find({
            email: email
        }).done(function (err, user) {
            if (user) {
                return res.json({
                    error: 'User already exists'
                })
            }
            
            //user did not exist, create
            Subscription.create({
                feeds: [],
                unread: []
            }).done(function (err, sub) {
                if (err) console.log('error creating subscription')
                var user = {
                    email: email,
                    pass: pass,
                    subscription: sub.id
                }
                User.create(user).done(function (err, user) {
                    if (err) console.log('error creating user')
                    res.json(sub)
                })
            })
        })

    }
};
module.exports = UserController;