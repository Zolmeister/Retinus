//fetch and update database feeds

console.log('feeder starting')

var request = require('request')
var databaseUrl = "retinus"; // "username:password@example.com/mydb"
var collections = ["feed", "feeditem", "subscription"]
var db = require("mongojs")(databaseUrl, collections)
var ObjectId = require('mongodb').BSONPure.ObjectID
var feedutil = require('./feedutil')
var polish = require('polish')

//TODO: move to config file
var embedKey = '5c86b96b5c30467bad06dd9f518f52e3'
var embedUrl = 'http://api.embed.ly/1/oembed?key=' + embedKey
var interval = 1000 * 60 * 60 * 4; // 4 hours
var queueInterval = 1000 * 10; // 10 seconds

var itemQueue = [];

function updateAll() {
    db.feed.find(function (err, feeds) {
        feeds.forEach(function (feed, i) { // for each feed
            
            // space out feed updates to not swamp server
            setTimeout(function () {
                updateFeed(feed)
            }, 1000 * i)
        })
    })
}

function updateFeed(feed) {
    var itemIds = feed.items
    db.feeditem.find({
        _id: {
            $in: itemIds
        }
    }, function (err, feedItems) {
        if (err) return console.log('error updating feed', err)
        var titles = feedItems.map(function (item) {
            return ''+item.title
        })

        feedutil.extractFeedContent(feed.feedurl).then(function (items) {
            //start with the oldest result (last one)
            items.reverse().forEach(function (item) {
                // if 
                if (titles.indexOf(item.title) === -1) {
                    enqueueItem(feed._id, item)
                }
            })
        })
    })
}

function enqueueItem(feedId, item) {
    itemQueue.push([feedId, item])
}

function processItemQueue() {
    //process 5 items
    for (var i = 0; i < 5; i++) {
        var queued = itemQueue.pop(0)
        if (!queued) {
            break
        }
        var feedId = queued[0]
        var item = queued[1]
        item.link = feedutil.getLink(item.link, item.desciption)

        request(embedUrl + '&url=' + item.link, (function (feedId, item) {
            return function (err, res, embed) {
                if (err) return console.log('error fetching url summary')
                try {
                    item.summary = JSON.parse(embed).description
                    insertItem(feedId, item)
                } catch (err) {
                    console.log(err)
                }
            }
        })(feedId, item))
    }
}

function insertItem(feedId, feeditem) {
    db.feeditem.insert(feeditem, function (err, item) {
        if (err) return console.log('error inserting feed item', err, feeditem)
        item = item[0]
        var itemId = item._id
        //add to feed items list
        db.feed.update({
            _id: feedId
        }, {
            $push: {
                items: itemId
            }
        }, function (err, res) {
            if (err) console.log(err)
        })

        //add to subscribers
        db.subscription.update({
            'feeds.feedId': feedId
        }, {
            $push: {
                unread: {
                    feedItemId: itemId,
                    feedId: feedId
                }
            }
        }, function (err, res) {
            if (err) console.log(err)
        })
    })
}

updateAll()
setInterval(updateAll, interval)
setInterval(processItemQueue, queueInterval)

process.on('message', function (m) {
    console.log('got message')
    if (m.command === 'updateFeed') {
        db.feed.findOne({
            _id: new ObjectId(m.feedId)
        }, function (err, feed) {
            if (err) return console.log('error getting feed to update')
            updateFeed(feed)
        })
    }
})