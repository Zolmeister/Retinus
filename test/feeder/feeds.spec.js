var feeds = require('./../../feedutil')

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