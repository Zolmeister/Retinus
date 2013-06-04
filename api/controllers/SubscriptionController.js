/*---------------------
	:: Subscription 
	-> controller
---------------------*/
var ObjectId = require('mongodb').BSONPure.ObjectID
var jsdom = require('jsdom');
var fs = require('fs');
var jquery = fs.readFileSync("./jquery.js").toString();

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
        if (!websiteUrl) return res.json({
            err: 'no feedurl specified'
        })
        getRSSfromUrl(websiteUrl, function (err, RSSurl) {
            if (err) {
                console.log('error getting rss feed url')
                return res.json({
                    err: err
                })
            }
            var folder = req.param('folder', '__main__') || '__main__'
            console.log('session user', req.session.user)
            var userId = req.session.user && req.session.user.id
            var feedId
            console.log('userId', userId)
            console.log('feedurl', RSSurl)

            //get the feed that corresponds to the feedurl
            //TODO: add last 10 items from feed to users unread
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

                return Feed.create(feed).then(function (feed) {
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
    jsdom.env({
        html: url,
        src: [jquery],
        done: function (errors, window) {
            if (errors) return callback(errors)
            var $ = window.$
            //search for rss link in html
            var discovery = $('link[type=application\\\/rss\\\+xml]')[0]
            if (!discovery || !discovery.href) {
                //check if we were given an rss feed to begin with
                if ($('rss')) {
                    return callback(null, url)
                } else {
                    return callback('could not find rss feed url')
                }
            } else {
                return callback(null, discovery.href)
            }
        }
    })
}