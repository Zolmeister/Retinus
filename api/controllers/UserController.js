/*---------------------
	:: User 
	-> controller
---------------------*/
var UserController = {

    index: function (req, res) {
        User.findAll(function (req, users) {
            res.json(users)
        })
    }
};
module.exports = UserController;