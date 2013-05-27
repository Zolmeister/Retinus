//fetch and update database feeds

console.log('feeder starting')

var databaseUrl = "retinus"; // "username:password@example.com/mydb"
var collections = ["feed", "feedItem", "subscription"]
var db = require("mongojs")(databaseUrl, collections);

var interval = 1000 * 60 * 20 //20 mins

function updateAll() {
    db.feed.find(function(err, docs) {
        console.log(docs)
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
updateAll()
setTimeout(updateAll, interval)