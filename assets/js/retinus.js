// #main
Unread = Backbone.Model.extend()

UnreadView = Backbone.View.extend()

UnreadCollection = Backbone.Collection.extend({
    model: Unread,
    url: "/subscription/unread"
})

UnreadCollectionView = Backbone.View.extend()




//#sidebar

Feed = Backbone.Model.extend()

FeedCollection = Backbone.Collection.extend({
    model: Feed,
    url: "/subscription/feeds"
})


FeedCollectionView = Backbone.View.extend({
    template: _.template($('#sidebarView').html()),

    events: {
        'click .addFeed': 'addFeed'
    },

    initialize: function () {
        this.model.bind("add", this.render, this)
        _.bindAll(this, 'addFeed')
    },

    addFeed: function (ev) {
        //todo: make this a view and use events
        var url = prompt('feed url:')
        var folder = prompt('folder name (optional)')
        if(!url)
            return
        var self = this
        var req= {}
        req.feedurl = url
        if(folder)
            req.folder = folder
        $.post('/subscription/subscribe', req, function(){
            self.model.fetch()  
        })
    },

    render: function () {
        var rend = {
            folders: []
        }
        var folders = {}
        var feeds = this.model.models
        for (var i in feeds) {
            var feed = feeds[i].toJSON()
            if (folders[feed.folder]) {
                folders[feed.folder].feeds.push(feed)
            } else {
                folders[feed.folder] = {
                    name: feed.folder,
                    feeds: [feed]
                }
            }
        }
        for (var folder in folders) {
            folders[folder].unread = folders[folder].feeds.reduce(function(f1, f2){
                return f1.unread+f2.unread
            })
            rend.folders.push(folders[folder])
        }
        rend.folders.sort(function (folder1, folder2) {
            return folder1.name.localeCompare(folder2.name)
        })
        $(this.el).html(this.template(rend))
        return this
    }
})


var feeds = new FeedCollection()
var sideBar = new FeedCollectionView({
    model: feeds,
    el: $('#sidebar')
})

feeds.fetch()
sideBar.render()