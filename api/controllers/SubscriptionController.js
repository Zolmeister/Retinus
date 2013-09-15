/*---------------------
	:: Subscription 
	-> controller
---------------------*/
var ObjectId = require('mongodb').BSONPure.ObjectID
var jsdom = require('jsdom');
var fs = require('fs');
var jquery = fs.readFileSync("./jquery.js").toString();
var feedutil = require('../../feedutil')
var request = require('request');
var natural = require('natural');
var url = require('url');


// HACK
var mongojs = require('mongojs'),
db = mongojs('retinus', ['feeditem', 'ml'])

var classifier1, classifier2, classifier3;
db.ml.findOne({sub: '51bd4e7fc5840f1f7d000001'}, function(err, zolmeisterML){
  classifier1 = natural.BayesClassifier.restore(zolmeisterML.summaryClassifier)
  classifier2 = natural.BayesClassifier.restore(zolmeisterML.titleClassifier)
  classifier3 = natural.BayesClassifier.restore(zolmeisterML.linkClassifier)
})

var SubscriptionController = {
    index: function (req, res) {
        var sub = req.session.sub
        return res.redirect('/subscription/' + sub)
    },
    classify: function(req, res) {
      var feedItemId = req.param('feedItemId')
      db.feeditem.findOne({_id: feedItemId}, function(err, feedItem){
        if(err || !feedItem) return res.json({err: 'error finding feedItem'})
        
        // classify
        var hostname = url.parse(feedItem.link).hostname.replace(/\./g,'_')
  
        var tag1 = classifier1.classify(feedItem.summary.toLowerCase())
        var tag2 = classifier2.classify(feedItem.title.toLowerCase())
        var tag3 = classifier3.classify(hostname)
        
        var final = (tag1 === 'true' && tag3 === 'true' || tag2 === 'true'  ? true : false)
        return res.json({
          interesting: final
        })
      })
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
    unreadCount: function (req, res) {
        var sub = req.session.sub
        Subscription.find({
            _id: sub
        }).then(function (sub) {
            return res.json({
                count: sub.values.unread.length
            })
        }).fail(function (e) {
            return res.json({
                err: 'error getting unread'
            })
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
        var interesting = req.param('interesting') == 'true' ? true : false

        var feedItemId;
        try {
            feedItemId = new ObjectId(req.param('feedItemId'))
        } catch (e) {
            return res.json({
                err: 'bad feedItemId'
            })
        }
        // remove from unread list
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

            // log interest
            console.log('interesting: ', interesting)
            History.create({
                sub: req.session.sub,
                interesting: interesting,
                feedItemId: feedItemId
            }).then(function (hist) {
                return res.json({
                    success: true
                })
            }).fail(function (err) {
                return res.json({
                    err: 'error saving'
                })
            })
        })
    },
    markInteresting: function (req, res) {
        console.log('mark interesting', req.param('feedItemId'))
        var feedItemId;
        try {
            feedItemId = new ObjectId(req.param('feedItemId'))
        } catch (e) {
            return res.json({
                err: 'bad feedItemId'
            })
        }
      
      

        History.update({
            feedItemId: feedItemId
        }, {
            interesting: true
        }, function (err, hist) {
          if (err) {
              return res.json({
                  err: 'error saving'
              })
          }
          if(req.session.sub === '51bd4e7fc5840f1f7d000001') {
            // update classifier
            db.feeditem.findOne({_id: feedItemId}, function(err, feedItem){
                if(err || !feedItem) return res.json({err: 'error finding feedItem'})
                    // train history based on hostname
                var hostname = url.parse(feedItem.link).hostname.replace(/\./g,'_')
                // bayes text classifiers
                classifier1.addDocument(feedItem.summary.toLowerCase(), true)
                classifier2.addDocument(feedItem.title.toLowerCase(), true)
                classifier3.addDocument([hostname], true)
                
                classifier1.train()
                classifier2.train()
                classifier3.train()
              
                return res.json({
                    success: true
                })
            })
          }
          else {
            return res.json({
                  success: true
              })
          }
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
        var subId = req.session.sub

        if (!websiteUrl) return res.json({
            err: 'no feedurl specified'
        })

        SubscriptionController.subscribeFeed(websiteUrl, folder, subId, function (err, sub) {
            if (err) {
                console.log('error subscribing to rss url', err)
                return res.json({
                    err: err
                })
            }
            return res.json(sub)
        })

    },
    subscribeFeed: function (websiteUrl, folder, subId, cb) {
        return feedutil.getFeedUrl(websiteUrl).then(function (RSSurl) {
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

            console.log('subscribing to new feed')
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
                try {
                    feedDaemon.send({
                        command: 'updateFeed',
                        feedId: feed.id
                    })
                } catch (e) {
                    console.log('feedDaemon gone')
                }
            }
            //write changes to subscriptions
            Subscription.update({
                _id: sub.values.id
            }, sub.values, function (e) {
                cb(e, sub);
            })

        }).fail(function (err) {
            cb(err);
        })
    }
};
module.exports = SubscriptionController;