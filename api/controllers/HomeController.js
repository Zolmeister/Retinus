/*---------------------
	:: Home 
	-> controller
---------------------*/
var HomeController = {

    index: function(req, res){
        if(!req.session.authenticated)
            return res.redirect('/login')
        return res.render('home')
    }

};
module.exports = HomeController;