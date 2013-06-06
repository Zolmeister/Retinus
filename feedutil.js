var Q = require('q')
var request = require('request')
var xmlParser = require('xml2json')
var jsdom = require('jsdom');
var jquery = require('fs').readFileSync("./jquery.js").toString();

function getFeedUrl(url) {
    var deferred = Q.defer()
    if(url.indexOf('http')===-1){
        url = 'http://'+url
    }
    jsdom.env({
        html: url,
        src: [jquery],
        done: function (errors, window) {
            if (errors) return deferred.reject(errors)
            var $ = window.$
            //search for rss link in html
            var discovery = $('link[type=application\\\/rss\\\+xml]')[0]
            if (!discovery || !discovery.href) {
                //check if we were given an rss feed to begin with
                if ($('rss') || $('feed')) {
                    return deferred.resolve(url)
                } else {
                    return deferred.reject('could not find rss feed url')
                }
            } else {
                return deferred.resolve(discovery.href)
            }
        }
    })
    return deferred.promise
}

function getFeedType(result) {
    if (result.rss && result.rss.channel) { //rss 2.0 spec
        return 'rss'
    } else if (result.feed) {
        return 'atom'
    }
    return null
}

function parseXml(body) {
    var deferred = Q.defer()
    try {
        var result = JSON.parse(xmlParser.toJson(body))
        deferred.resolve(result)
    } catch (err) {
        console.log(err)
        deferred.reject(err)
    }
    return deferred.promise
}
/* types of feed layouts:
rss:
http://feeds.feedburner.com/newsyc100

atom:
http://fasthorizon.blogspot.com/feeds/posts/default
http://what-if.xkcd.com/feed.atom
*/
function extractFeedContent(url) {
    return fetchFeed(url).then(function (body) {
        return parseXml(body)
    }).then(function (result) {
        return [result, getFeedType(result)]
    }).spread(function (result, type) {
        var items = []
        if (type === 'rss') {
            var channel = result.rss.channel
            var channelItems = channel.item
            channelItems.forEach(function (item) {
                var title = item.title
                var link = item.link
                var description = item.description
                if (!title || !link) return
                var comp = {
                    title: title,
                    link: link,
                    description: description
                }
                items.push(comp)
            })
        } else if (type === 'atom') {
            var entries = result.feed.entry
            entries.reverse().forEach(function (item) {
                var title = item.title
                var description = item.content || item.summary
                var link = item.link && item.link.href
                
                // to accomodate http://fasthorizon.blogspot.com/feeds/posts/default
                if(typeof title==='object' && title.$t)
                    title = title.$t
                if(typeof description==='object' && description.$t)
                    description = description.$t
                if(!link && item.link && item.link[2] && item.link[2].href)
                    link = item.link[2].href
                if(typeof description!=='string')
                    description=''
                // yes, sometimes there is no title, so we must construct one
                if(typeof title!=='string' && typeof description==='string' && description.length>=40){
                    title = description.substr(0,40)+'...'
                }
                   
                if (typeof title!=='string' || typeof link!=='string') {
                    throw new Error('failed to extract'+ JSON.stringify(item,null,2))
                }
                var comp = {
                    title: title,
                    link: link,
                    description: description
                }
                items.push(comp)
            })
        }
        return items
    }).fail(function(err){
        return console.log('error extracting feed content', err)  
    })
}

function fetchFeed(url) {
    var deferred = Q.defer()
    request(url, function (err, res, body) {
        if (err) return deferred.reject(err)
        return deferred.resolve(body)
    })
    return deferred.promise
}

function checkUrl(rssUrl) {
    //succeeds with url
    return fetchFeed(rssUrl).then(function(body){
        return parseXml(body)
    }).then(function(json){
        var type = getFeedType(json)
        if(type==='rss' || type==='atom') {
            return rssUrl
        } else {
            throw new Error('invalid url') 
        }
    })
}

exports.getFeedUrl = getFeedUrl
exports.getFeedType = getFeedType
exports.extractFeedContent = extractFeedContent
exports.fetchFeed = fetchFeed
exports.checkUrl = checkUrl
exports.parseXml = parseXml