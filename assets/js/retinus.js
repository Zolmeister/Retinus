// #main

Unread = Backbone.Model.extend()

UnreadCollection = Backbone.Collection.extend({
    model: Unread,
    url: "/subscription/unread",
    initialize: function (filter, preloadCount, postLoadCount) {

        //how many initially load
        this.preloadCount = preloadCount || 6

        //how many to read before refilling
        this.postLoadCount = postLoadCount || 2

        this.currentFilter = filter || function (unread) {
            return true
        }
        vent.on('Unread:applyFilter', this.applyFilter.bind(this))

        this.selected = null
        _.bindAll(this, 'loopUnread')
    },
    applyFilter: function (filter) {
        console.log('filter')
        if (filter && filter !== this.currentFilter) {
            //when applying new filter, clear all visible
            this.loopUnread(function (unread) {
                //TODO: fix this hack
                unread.set('loaded', false)
                unread.set('visible', false)
            })
        }
        this.currentFilter = filter || this.currentFilter
        var unreads = this.models
        var currentCount = 0
        this.loopUnread(function (unread) {
            // decide whether to show item or not
            if (this.currentFilter(unread)) {
                if (!unread.get('loaded') && currentCount < this.preloadCount) {
                    //load feed item
                    $.getJSON('/feeditem/' + unread.get('feedItemId'), function (res) {
                        for (var key in res) {
                            unread.set(key, res[key])
                        }
                        unread.set('loaded', true)
                        unread.set('visible', true)
                        this.trigger('filterUpdate')
                    }.bind(this))
                    currentCount++
                }
                unread.set('filter', true)

            } else {
                unread.set('filter', false)
            }
        }.bind(this))
        this.trigger('filterUpdate')
    },
    select: function (node) {
        //if given the nodes id, find the node
        if (typeof node === 'string') {
            for (var i = 0; i < this.models.length; i++) {
                if (this.models[i].get('feedItemId') === node) {
                    node = this.models[i]
                    break
                }
            }
        }
        //mark target node as selected, and mark as read
        //if going backwards, mark read items as visible
        if (this.selected && node && this.selected !== node) {
            var indexSelected = this.models.indexOf(this.selected)
            var indexTarget = this.models.indexOf(node)
            if (indexTarget > indexSelected) {
                //were going backwards
                this.selected.set('visible', true)
            } else {
                for (var i = this.models.length - 1; i >= indexSelected; i--) {
                    this.models[i].set('visible', false)
                }
            }
            this.selected.set('selected', false)
        } else if (!node) {
            this.selected = null
        }
        if (node) {
            this.selected = node
            this.selected.set('selected', true)
            this.selected.set('visible', true)
            this.selected.set('read', true)
            this.markRead(this.selected)
        }

        var visibleCount = 0
        var fetchNew = true
        this.loopUnread(function (unread) {
            if (unread.get('visible')) {
                visibleCount++
            }
            if (unread.get('filter') && !unread.get('read')) {
                fetchNew = false
            }
        })

        //count visible, if its low load another item
        console.log('visible', visibleCount)
        if (visibleCount <= this.preloadCount - this.postLoadCount) {
            console.log('load more')
            this.applyFilter()
        }

        // if all items have been read, fetch to check for new stuff
        if (fetchNew && !this.selected) {
            this.fetch({
                success: function () {
                    vent.trigger('Unread:update')
                }
            })
        }
    },
    markRead: function (node) {
        $.post('/subscription/markRead', {
            feedItemId: node.get('feedItemId')
        }, function (res) {
            console.log('mark', res)
        })
    },
    getNext: function () {
        var index = this.selected ? this.models.indexOf(this.selected) - 1 : this.models.length - 1
        return index !== -1 ? this.models[index] : undefined
    },
    getPrevious: function () {
        var index = this.selected ? this.models.indexOf(this.selected) + 1 : -1
        if (index >= this.models.length || index === -1) {
            return undefined
        }
        return this.models[index]
    },
    loopUnread: function (fn) {
        var unreads = this.models
        for (var i = unreads.length - 1; i >= 0; i--) {
            var unread = unreads[i]
            fn(unread)
        }
    }
})

// TODO: efficient add/remove, instead of reloading entire view
UnreadCollectionView = Backbone.View.extend({
    template: _.template($('#main-view').html()),
    events: {
        'click .unread-item': 'selectUnread'
    },
    initialize: function () {
        //this.model.bind("add", this.update, this)
        vent.on('Unread:update', this.update.bind(this))
        this.model.bind("filterUpdate", this.render, this)
        $(document).bind('keydown', this.keydown.bind(this))
    },
    render: function () {
        console.log('rendering')
        var rend = {
            items: this.model.toJSON()
        }
        $(this.el).html(this.template(rend))
        return this
    },
    update: function () {
        console.log('applying filter')
        this.model.applyFilter()
    },
    selectUnread: function (ev) {
        var id = ev.target.parentElement.getAttribute('data-id')
        this.model.select(id)
        this.render()
    },
    keydown: function (ev) {
        if (ev.which === 74) { // J, go down to next item
            console.log('select next')
            this.model.select(this.model.getNext())
            this.render()
        }
        if (ev.which === 75) { // K, go up to previous item
            console.log('select previous')
            this.model.select(this.model.getPrevious())
            this.render()
        }
    },
    close: function () {
        this.remove();
        this.unbind();
        this.model.unbind("add updated")
    }
})




//#sidebar

Feed = Backbone.Model.extend()

FeedCollection = Backbone.Collection.extend({
    model: Feed,
    url: "/subscription/feeds"
})


FeedCollectionView = Backbone.View.extend({
    template: _.template($('#sidebar-view').html()),

    events: {
        'click .add-feed': 'addFeed',
        'click .feed, .folder-text, .all-items': 'filter',
        'click .minimize': 'minimize',
        'click': 'maximize'
    },

    initialize: function () {
        this.model.bind("add", this.render, this)
        _.bindAll(this, 'addFeed')
        this.minimized = false
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
    minimize: function (ev) {
        this.minimized = true
        $(ev.target).parent().addClass('shrunk')
        $('#main').addClass('biggen')
        this.render()
    },
    maximize: function (ev) {
        var target = $(ev.target)
        if (target.hasClass('shrunk')) {
            this.minimized = false
            target.removeClass('shrunk')
            $('#main').removeClass('biggen')
            this.render()
        }
    },

    filter: function (ev) {
        var filter
        var target = $(ev.target)
        var type = target.attr('class')
        if (type === 'feed') {
            //filter by feed
            var feedId = target.data('id')
            filter = function (unread) {
                if (unread.get('feedId') === feedId) {
                    return true
                }
                return false
            }
        } else if (type === 'folder-text') {
            //filter by folder
            var folder = target.parent()
            var feedIds = []
            folder.children('.feed').each(function (i, feed) {
                feedIds.push(feed.getAttribute('data-id'))
            })
            filter = function (unread) {
                if (feedIds.indexOf(unread.get('feedId')) !== -1) {
                    return true
                }
                return false
            }

        } else if (type === 'all-items') {
            filter = function (unread) {
                return true
            }
        }
        vent.trigger('Unread:applyFilter', filter)
    },

    render: function () {
        var rend = {
            folders: [],
            minimized: this.minimized
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
    },
    close: function () {
        this.remove();
        this.unbind();
    }
})

LoginView = Backbone.View.extend({
    template: _.template($('#login-view').html()),
    events: {
        'submit #login-form': 'login',
        'submit #signup-form': 'signup'
    },
    render: function () {
        $(this.el).html(this.template({}))
    },
    login: function (ev) {
        ev.preventDefault()
        console.log('logging in')
        $.post('/auth/login', $('#login-form').serialize(), this.verifyLogin)
    },
    signup: function (ev) {
        ev.preventDefault()
        console.log('signing up')
        $.post('/auth/signup', $('#signup-form').serialize(), this.verifyLogin)
    },
    verifyLogin: function (res) {
        console.log(res)
        if (res.success === true) {
            Authed = true
            vent.trigger('Login:logged in')
        }
    },
    close: function () {
        this.remove();
        this.unbind();
    }
})

var AppRouter = Backbone.Router.extend({
    routes: {
        "": "home",
        "login": "login",
        "logout": "logout"
    },
    initialize: function (vent) {
        vent.on('Login:logged in', function () {
            this.navigate('', true)
        }.bind(this))
        this.currentViews = []
    },
    showViews: function () {
        var views = Array.apply([], arguments)
        this.currentViews.forEach(function (view) {
            view.close()
        })
        this.currentViews = views
        this.currentViews.forEach(function (view) {
            view.render()
        })
    },
    home: function () {
        var self = this
        //TODO: fix this hack
        $('.logout').show()
        if (typeof Authed !== "undefined" && !Authed) {
            return this.navigate("login", true)
        }
        var feeds = new FeedCollection()
        var $el =  $('<div id="sidebar">')
        $('body').append($el)
        var sideBar = new FeedCollectionView({
            model: feeds,
            el: $el
        })
        var unread = new UnreadCollection()
        $el = $('<div id="main">')
        $('body').append($el)
        var mainView = new UnreadCollectionView({
            model: unread,
            el: $el
        })
        unread.fetch({
            success: function () {
                vent.trigger('Unread:update')
                feeds.fetch({
                    success: function () {
                        self.showViews(mainView, sideBar)
                    }
                })
            }
        })
    },
    login: function () {
        //TODO: fix this hack
        $('.logout').hide()
        var $el =  $('<div id="login">')
        $('body').append($el)
        var loginView = new LoginView({
            el: $el
        })
        this.showViews(loginView)
    },
    logout: function(){
        $.get('/auth/logout', function(res){
            Authed = false
            this.navigate('login',true)
        }.bind(this))
    }
})

var vent = _.extend({}, Backbone.Events);
var retinusRoute = new AppRouter(vent)
Backbone.history.start()