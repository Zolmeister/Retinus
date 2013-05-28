/*---------------------
	:: Home 
	-> controller
---------------------*/
var HomeController = {

    index: function(req, res){
        return res.render('home', {
            authed: req.session.authenticated ? true : false
        })
    }

};
module.exports = HomeController;