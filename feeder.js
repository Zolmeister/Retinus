//fetch and update database feeds

console.log('feeder starting')

var request = require('request')
var xml2js = require('xml2js')
var databaseUrl = "retinus"; // "username:password@example.com/mydb"
var collections = ["feed", "feeditem", "subscription"]
var db = require("mongojs")(databaseUrl, collections);
var ObjectId = require('mongodb').BSONPure.ObjectID

var embedKey = '5c86b96b5c30467bad06dd9f518f52e3'
var embedUrl = 'http://api.embed.ly/1/oembed?key=' + embedKey

var interval = 1000 * 60 * 20; //20 mins

function updateAll() {
    var newStuff = {}
    var newDates = {}
    var asyncLeft = 0
    var rateLimit = 15
    var currentRate = 0;

    function addItem(item, feed) {
        console.log('adding new item to', feed._id, item)
        asyncLeft += 1
        currentRate += 1
        setTimeout(function () {
            request(embedUrl + '&url=' + item.link, function (err, res, embed) {
                done()
                if (err) return console.log('error fetching url summary')
                try {
                    item.summary = JSON.parse(embed).description
                    asyncLeft += 1
                    db.feeditem.insert(item, function (err, item) {
                        done()
                        if (err) return console.log('error inserting feed item')
                        item = item[0]
                        var itemId = item._id
                        if (newStuff[feed._id]) newStuff[feed._id].push(itemId)
                        else newStuff[feed._id] = [itemId]

                        if (newDates[feed._id]) {
                            if (item.date > newDates[feed._id]) newDates[feed._id] = item.date
                        } else {
                            newDates[feed._id] = item.date
                        }
                    })
                } catch (err) {
                    console.log(err)
                }
            })
        }, 2000 * Math.floor(currentRate / rateLimit))
    }

    function finished() {
        console.log('finished getting new stuff, updating models')

        //update newest dates for all feeds
        for (var feedId in newDates) {
            db.feed.update({
                _id: new ObjectId(feedId)
            }, {
                $set: {
                    newestDate: newDates[feedId]
                }
            }, function (err, res) {
                if (err) console.log(err)
            })
        }

        //update feed objects with item ids
        for (var thing in newStuff) {
            db.feed.update({
                _id: new ObjectId(thing)
            }, {
                $pushAll: {
                    items: newStuff[thing]
                }
            }, function (err, res) {
                if (err) console.log(err)
            })
        }

        //update user subscriptions with new unread
        for (var thing in newStuff) {
            newStuff[thing].forEach(function (item) {
                db.subscription.update({
                    'feeds.feedId': new ObjectId(thing)
                }, {
                    $push: {
                        unread: {
                            feedItemId: item,
                            feedId: new ObjectId(thing)
                        }
                    }
                }, function (err, res) {
                    if (err) console.log(err)
                })
            })
        }
    }



    function done() {
        process.nextTick(function () {
            asyncLeft -= 1
            if (asyncLeft == 0) {
                finished()
            }
        })
    }

    db.feed.find(function (err, feeds) {
        feeds.forEach(function (feed) { // for each feed
            asyncLeft += 1
            request(feed.feedurl, function (err, res, body) { //fetch feed url
                done()
                if (err) return console.log('error fetching', feed.feedurl)
                try {
                    xml2js.parseString(body, function (err, result) { //syncronous
                        if (err) console.log("error parsing xml page", err)
                        if (result.rss && result.rss.channel) { //rss 2.0 spec
                            var channel = result.rss.channel[0]
                            var newestItemDate = feed.newestDate
                            var items = channel.item
                            items.reverse().forEach(function (item) {
                                var title = item.title[0]
                                var date = new Date(item.pubDate[0])
                                var link = getLink(item.link[0], item.desciption)
                                var comp = {
                                    title: title,
                                    date: date,
                                    link: link
                                }

                                if (date > feed.newestDate) { // new feed item
                                    addItem(comp, feed)
                                }
                            })
                        } else if (result.feed) {
                            var items = result.feed.entry
                            items.reverse().forEach(function (item) {
                                var title = item.title[0]
                                var date = new Date(item.updated[0])
                                var description = items[0].content[0]._
                                var link = getLink(item.link[0].$.href, description)
                                var comp = {
                                    title: title,
                                    date: date,
                                    link: link
                                }
                                if (date > feed.newestDate) { // new feed item
                                    addItem(comp, feed)
                                }
                            })
                        }
                    })
                } catch (err) {
                    console.log("error parsing xml page", err)
                }
            })
        })
    })
}
updateAll()
setInterval(updateAll, interval)

function getLink(link, description) {
    if (link.indexOf('reddit.com') !== -1) {
        var matched = description.match('<br> <a href="(.+)">\\[link\\]</a>')
        console.log('reddit feed, extracting link', matched[1])
        return matched && matched[1] || link
    }
    return link
}