/*---------------------
	:: Subscription 
	-> controller
---------------------*/
var ObjectId = require('mongodb').BSONPure.ObjectID
var jsdom = require('jsdom');
var fs = require('fs');
var jquery = fs.readFileSync("./jquery.js").toString();
var feedutil = require('../../feedutil')
var request = require('request')

var SubscriptionController = {
    index: function (req, res) {
        var sub = req.session.sub
        return res.redirect('/subscription/' + sub)
    },
    feeds: function (req, res) {
        var sub = req.session.sub
        Subscription.find({
            _id: sub
        }).then(function (sub) {
            return res.json(sub.values.feeds)
        }).fail(function (e) {
            return res.json({})
        })
    },
    unread: function (req, res) {
        var sub = req.session.sub
        Subscription.find({
            _id: sub
        }).then(function (sub) {
            return res.json(sub.values.unread)
        }).fail(function (e) {
            return res.json({})
        })
    },
    markRead: function (req, res) {
        console.log('read', req.param('feedItemId'))
        try {
            var feedItemId = new ObjectId(req.param('feedItemId'))
        } catch (e) {
            return res.json({
                err: 'bad feedItemId'
            })
        }
        var sub = req.session.sub
        Subscription.update({
            _id: sub
        }, {
            $pull: {
                unread: {
                    feedItemId: feedItemId
                }
            }
        }, function (err, sub) {
            if (err || !sub) {
                return res.json({
                    err: 'can\'t mark as read'
                })
            }
            return res.json({
                success: true
            })
        })
    },
    unsub: function (req, res) {
        console.log('unsub', req.param('feedId'))
        try {
            var feedId = new ObjectId(req.param('feedId'))
        } catch (e) {
            return res.json({
                err: 'bad feedId'
            })
        }
        var sub = req.session.sub
        Subscription.update({
            _id: sub
        }, {
            $pull: {
                feeds: {
                    feedId: feedId
                },
                unread: {
                    feedId: feedId
                }
            }
        }, function (err, sub) {
            if (err || !sub) {
                return res.json({
                    err: 'can\'t remove feed'
                })
            }
            return res.json({
                success: true
            })
        })
    },
    subscribe: function (req, res) {
        console.log('subscribing')
        var websiteUrl = req.param('feedurl')
        var folder = req.param('folder', '__main__') || '__main__'
        var userId = req.session.user && req.session.user.id
        var subId = req.session.sub

        if (!websiteUrl) return res.json({
            err: 'no feedurl specified'
        })

        feedutil.getFeedUrl(websiteUrl).then(function (RSSurl) {
            //make sure we have a valid rss feed
            return feedutil.checkUrl(RSSurl)
        }).then(function (RSSurl) {
            //if feed exists, use that, otherwise create a new feed
            return Feed.find({
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
                    items: []
                }
                return Feed.create(feed)
            })

        }).then(function (feed) {
            //get user subscription object
            return Subscription.find({
                _id: subId
            }).then(function (sub) {
                console.log('got sub')
                return [feed, sub]
            })
        }).spread(function (feed, sub) {
            if (!sub) console.log('error finding user subscription')
            var alreadyHas = sub.feeds.filter(function (innerfeed) {
                if (feed.id.toString() === innerfeed.feedId.toString()) return true
            })
            if (alreadyHas.length > 0) {
                console.log('aready subscribed to that feed')
                return res.json(sub)
            }

            console.log('subscibing to new feed')
            sub.values.feeds.push({
                name: websiteUrl,
                feedId: feed.id,
                folder: folder
            })

            //add last 10 items from feed to users unread
            var last10 = feed.items.slice(feed.items.length - 10).map(function (item) {
                return {
                    feedItemId: item,
                    feedId: feed.id
                }
            })
            sub.values.unread = sub.values.unread.concat(last10)
            //if we havent seen the feed before, update it immidiately
            if (last10.length === 0) {
                console.log('sending')
                feedDaemon.send({
                    command: 'updateFeed',
                    feedId: feed.id
                })
            }
            //write changes to subscriptions
            Subscription.update({
                _id: sub.values.id
            }, sub.values, function (e) {
                if (e) console.log('error updating subscription')
                return res.json(sub)
            })

        }).fail(function (e) {
            console.log('error subscribing to rss url', e)
            return res.json({
                err: err
            })
        })

    }
};
module.exports = SubscriptionController;