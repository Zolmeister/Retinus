// #main

Unread = Backbone.Model.extend()

UnreadCollection = Backbone.Collection.extend({
    model: Unread,
    url: "/subscription/unread",
    preload: function () {
        this.load(2)
    },
    load: function (count) {
        console.log('loading', count, range(Math.min(count, this.models.length)))
        range(Math.min(count, this.models.length)).forEach(function(i) {
            var model = this.models.g(-(i+1))
            model.set('loading', true)
            $.getJSON('/feeditem/' + model.get('feedItemId'), function (res) {
                console.log(res)
                for(var key in res){
                    model.set(key, res[key])
                }
                model.set('loading', false)
                console.log('triggering update')
                this.trigger('updated')
            }.bind(this))
        }.bind(this))
    }
})

UnreadCollectionView = Backbone.View.extend({
    template: _.template($('#mainView').html()),

    initialize: function () {
        this.model.bind("add updated", this.render, this)
    },

    render: function () {
        console.log('rendering')
        var rend = {
            items: this.model.toJSON()
        }
        $(this.el).html(this.template(rend))
        return this
    }
})




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
        if (!url) return
        var self = this
        var req = {}
        req.feedurl = url
        if (folder) req.folder = folder
        $.post('/subscription/subscribe', req, function () {
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
            folders[folder].unread = folders[folder].feeds.reduce(function (f1, f2) {
                return f1.unread + f2.unread
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

LoginView = Backbone.View.extend({
    template:  _.template($('#loginView').html()),
    render: function(){
        $(this.el).html(this.template({}))
    }
})

var AppRouter = Backbone.Router.extend({
    routes: {
        "": "home",
        "login": "login"
    },
    home:function(){
        console.log("homee")
        if(typeof Authed!== "undefined" && !Authed){
            return retinusRoute.navigate("/login",true)
        }
    },
    login: function(){
        console.log("login")
        var loginView = new LoginView({
             el: $('#login')
         })
        loginView.render()
    }
})


var retinusRoute = new AppRouter()
Backbone.history.start()



/*
var feeds = new FeedCollection()
var sideBar = new FeedCollectionView({
    model: feeds,
    el: $('#sidebar')
})

feeds.fetch()
sideBar.render()

var unread = new UnreadCollection()
var mainView = new UnreadCollectionView({
    model: unread,
    el: $('#main')
})
unread.fetch({
    success: function () {
        unread.preload()
    }
})*/