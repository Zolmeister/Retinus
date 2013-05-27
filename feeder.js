//fetch and update database feeds

console.log('feeder starting')

var MongoClient = require('mongodb').MongoClient;
var Q = require('q')

var Feed = Q.defer()
var FeedItem = Q.defer()
var Subscription = Q.defer()

MongoClient.connect('mongodb://localhost/retinus', function (err, db) {
    if (!err && db) {
        db.collection('feed', function (err, collection) {
            if (err || !collection) {
                console.error("failed to load Feed collection")
                Feed.reject(err)
            } else {
                Feed.resolve(collection)
            }
        })
        db.collection('feedItem', function (err, collection) {
            if (err || !collection) {
                console.error("failed to load FeedItem collection")
                FeedItem.reject(err)
            } else {
                FeedItem.resolve(collection)
            }
        })
        db.collection('subscription', function (err, collection) {
            if (err || !collection) {
                console.error("failed to load Subscription collection")
                Subscription.reject(err)
            } else {
                Subscription.resolve(collection)
            }
        })
    } else {
        console.error("failed to load database")
    }
})

var interval = 1000 * 60 * 20 //20 mins
var Feed, FeedItem, Subscription
Q.all([
    Feed.promise,
    FeedItem.promise,
    Subscription.promise
]).spread(function(feed, feedItem,subscription){
    Feed = feed
    FeedItem = feedItem
    Subscription = subscription
    updateAll()
})
function updateAll() {
    Feed.findOne({"feedurl" : "http://feeds.arstechnica.com/arstechnica/index/"},function (err, feeds) {
        console.log(feeds)
    })
    FeedItem.find().toArray(function (err, feeds) {
        console.log(feeds)
    })
    Subscription.find().toArray(function (err, feeds) {
        console.log(feeds)
    })
    /*
    newStuff = {}
for each feed:
    fetch feedurl
    newestItemDate = feed.newestItemDate
    for each feed item in fetched feed
        if date newer than feed.newestItemDate
            fetch summary
            feed.push item
            newStuff[feedId].push(item)
            if item.date newer than newestItemDate
                newestItemDate = item.date
    feed.newestItemDate = newestItemDate
for each user:
    for each feed of the users (in or out of folder) which has feedId in newStuff:
        unread.push newStuff[feedId]
        */
    var newStuff = {}


    setTimeout(this, interval)
}

setTimeout(updateAll, interval)