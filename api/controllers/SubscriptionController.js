/*---------------------
	:: Subscription 
	-> controller
---------------------*/
var ObjectId = require('mongodb').BSONPure.ObjectID
var SubscriptionController = {

	subscribe: function (req, res) {
		console.log('subscribing')
		var websiteUrl = req.param('feedurl', '')
		getRSSfromUrl(websiteUrl, function (RSSurl) {
			var folder = req.param('folder', '__main__')
			//DEBUG: REMOVE TEST USER
			var userId = req.session.User && req.session.User.id || '51a0553bed5c4d0c2c000002'
			var feedId
			console.log('userId', userId)
			console.log('feedurl', RSSurl)

			//get the feed that corresponds to the feedurl
			Feed.find({
				feedurl: RSSurl
			}).then(function (feed) {
				//feed exists, no need to create
				console.log('feed exists')
				feedId = feed.id
				return feed
			}).fail(function (e) { //err finding feed, it does not exist, create one
				//this should probably trigger a push to client through socket.io
				var feed = {
					feedurl: RSSurl,
					newestDate: -1,
					items: []
				}

				return Feed.create(feed).then(function(feed) {
					feedId = feed.id
					return feed
				})
			}).then(function (feed) {
				//subscribe user to the feed
				return User.find({
					_id: new ObjectId(userId)
				}).then(function (r) {
					console.log('got user')
					return r
				})
			}).then(function (user) {
				return Subscription.find({
					_id: user.subscription
				}).then(function (sub) {
					console.log('got sub')
					return sub
				})
			}).then(function (sub) {
				if (!sub) console.log('error finding user subscription')
				var alreadyHas = sub.feeds.filter(function (innerfeed) {
					if (feedId.toString() === innerfeed.feedId.toString()) return true
				})
				if (alreadyHas.length > 0) {
					console.log('aready subscribed to that feed')
					return res.json(sub)
				}

				console.log('subscibing to new feed')
				sub.values.feeds.push({
					name: websiteUrl,
					feedId: feedId,
					folder: folder
				})

				//console.log(sub.save())
				//sub.save()
				Subscription.update({
					_id: sub.values.id
				}, sub.values, function (e) {
					if (e) console.log('error updating subscription')
					res.json(sub)
				})

			}).fail(function (e) {
				console.log(e)
				res.json({
					err: true
				})
			})

		})
	}

};
module.exports = SubscriptionController;

function getRSSfromUrl(url, callback) {
	return callback(url)
}