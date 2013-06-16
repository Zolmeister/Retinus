var q = require('q')

var feeds = require('./../../feedutil')
//var feedUrls = ["http://feeds.feedburner.com/trailofbits", "http://feeds.arstechnica.com/arstechnica/index/", "http://atenlabs.com/blog/feed/", "http://www.darkoperator.com/blog/rss.xml", "http://carnal0wnage.blogspot.com/feeds/posts/default", "http://feeds.feedburner.com/Catch22_InSecurity", "http://feeds.feedburner.com/dailyjs", "http://feeds.feedburner.com/darknethackers", "http://feeds.feedburner.com/DilbertDailyStrip", "http://www.echojs.com/rss", "http://www.f-secure.com/weblog/weblog.rss", "http://fasthorizon.blogspot.com/feeds/posts/default", "http://firespotting.com/rss", "http://seclists.org/rss/fulldisclosure.rss", "http://www.gnucitizen.org/feed/", "http://googleresearch.blogspot.com/feeds/posts/default", "http://rjlipton.wordpress.com/feed/", "http://hackaday.com/feed/", "http://feeds.feedburner.com/newsyc100", "http://highlyscalable.wordpress.com/feed/", "http://feeds.feedburner.com/daeken", "http://engineering.indeed.com/blog/feed/", "http://instagram-engineering.tumblr.com/rss", "http://www.aaronsw.com/2002/feeds/pgessays.rss", "http://penny-arcade.com/feed", "http://feeds.feedburner.com/Room362com", "http://www.claudiocc.com/feed/", "http://www.stefankrause.net/wp/?feed=rss2", "http://www.reddit.com/r/technology/.rss", "http://feeds.feedburner.com/oatmealfeed", "http://blogs.valvesoftware.com/feed/", "http://what-if.xkcd.com/feed.atom", "http://www.xkcd.com/rss.xml", "http://data.xssed.org/news.rss"];
var rss = ['http://feeds.feedburner.com/trailofbits',
  'http://feeds.arstechnica.com/arstechnica/index/',
  'http://feeds.feedburner.com/newsyc100',
  'http://feeds.feedburner.com/DilbertDailyStrip',
  'http://feeds.feedburner.com/Catch22_InSecurity',
  'http://feeds.feedburner.com/darknethackers',
  'http://firespotting.com/rss',
  'http://seclists.org/rss/fulldisclosure.rss',
  'http://www.xkcd.com/rss.xml',
  'http://www.f-secure.com/weblog/weblog.rss',
  'http://penny-arcade.com/feed',
  'http://www.aaronsw.com/2002/feeds/pgessays.rss',
  'http://atenlabs.com/blog/feed/',
  'http://feeds.feedburner.com/daeken',
  'http://www.stefankrause.net/wp/?feed=rss2',
  'http://www.reddit.com/r/technology/.rss',
  'http://data.xssed.org/news.rss',
  'http://instagram-engineering.tumblr.com/rss',
  'http://www.darkoperator.com/blog/rss.xml',
  'http://www.echojs.com/rss',
  'http://engineering.indeed.com/blog/feed/',
  'http://rjlipton.wordpress.com/feed/',
  'http://blogs.valvesoftware.com/feed/',
  'http://highlyscalable.wordpress.com/feed/',
  'http://hackaday.com/feed/',
  'http://www.gnucitizen.org/feed/']

var atom = ['http://feeds.feedburner.com/dailyjs',
  'http://fasthorizon.blogspot.com/feeds/posts/default',
  'http://feeds.feedburner.com/Room362com',
  'http://what-if.xkcd.com/feed.atom',
  'http://carnal0wnage.blogspot.com/feeds/posts/default',
  'http://googleresearch.blogspot.com/feeds/posts/default']

//error http://feeds.feedburner.com/oatmealfeed

describe('Feeder', function () {
    
    describe('getFeedUrl', function () {
        it('should get the correct feedUrl for a site', function (done) {
            feeds.getFeedUrl('http://arstechnica.com/')
                .then(function (feedUrl) {
                expect(feedUrl).toBe('http://feeds.arstechnica.com/arstechnica/index/')
                done()
            }).fail(done)
        })
        it('should fail properly', function (done) {
            feeds.getFeedUrl('http://none')
                .then(function (feedUrl) {
                done(new Error('expected an error'))
            }).fail(function (err) {
                done()
            })
        })
    })
    describe('getFeedType', function () {
        it('should correctly identify a feed type', function () {
            var type = feeds.getFeedType({
                rss: {
                    channel: true
                }
            })
            expect(type).toBe('rss')
            type = feeds.getFeedType({
                feed: true
            })
            expect(type).toBe('atom')
        })
    })
    describe('parseXml', function () {
        it('should return json object from xml', function (done) {
            var xml = '<a><b>c</b></a>'
            feeds.parseXml(xml).then(function (json) {
                expect(json.a.b).toBe('c')
                done()
            }).fail(done)
        })
        it('should fail properly', function (done) {
            var xml = 'not_xml'
            feeds.parseXml(xml).then(function (json) {
                done(new Error('expected an error'))
            }).fail(function (err) {
                done()
            })
        })
    })
    describe('extractFeedContent', function () {
        it('should fetch and extract rss feeds', function (done) {
            q.all(rss.map(function (feedUrl) {
                return feeds.extractFeedContent(feedUrl).then(function (items) {
                    items.forEach(function (item) {
                        expect(item.title).toBeDefined()
                        expect(item.link).toBeDefined()
                        expect(item.description).toBeDefined()
                    })
                }).fail(function (err) {
                    console.log('error extracting feed', feedUrl, err)
                })
            })).then(function () {
                done()
            }).fail(done)
        })
        it('should fetch and extract atom feeds', function (done) {
            q.all(atom.map(function (feedUrl) {
                return feeds.extractFeedContent(feedUrl).then(function (items) {
                    items.forEach(function (item) {
                        expect(item.title).toBeDefined()
                        expect(item.link).toBeDefined()
                        expect(item.description).toBeDefined()
                    })
                }).fail(function (err) {
                    console.log('error extracting feed', feedUrl, err)
                })
            })).then(function () {
                done()
            }).fail(done)
        })
        it('should fail properly', function (done) {
            feeds.extractFeedContent('http://none.com').then(function(items){
                done(new Error('expected an error'))
            }).fail(function(err){
              done()  
            })
        })
    })
    describe('checkUrl', function () {
        it('should check if a url is a valid xml feed', function (done) {
            feeds.checkUrl('http://feeds.arstechnica.com/arstechnica/index/').then(function (url) {
                done()
            }).fail(done)
        })
    })
    describe('getLink', function () {
        it('should replace the content link for certain content', function () {
            var link = feeds.getLink('http://site1.com', 'this is content')
            expect(link).toBe('http://site1.com')
            link = feeds.getLink('http://reddit.com', '<br> <a href="http://site2.com">[link]</a>')
            expect(link).toBe('http://site2.com')
        })
    })
})