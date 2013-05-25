/*---------------------
	:: Feed 
	-> controller
---------------------*/
var FeedController = {
    
    index: function (req, res) {
        Feed.findAll(function (req, feeds) {
            res.json(feeds)
        })
    }

};
module.exports = FeedController;
