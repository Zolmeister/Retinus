//#sidebar

Feed = Backbone.Model.extend()

FeedCollection = Backbone.Collection.extend({
    model: Feed,
    url: "/subscription/feeds"
})


FeedCollectionView = Backbone.View.extend({
    template: _.template($('#sidebar-view').html()),

    events: {
        'click .add-feed': 'addFeedToggle',
        'submit .add-feed-form': 'submitFeed',
        'click .import': 'importToggle',
        'click .refresh': 'refresh',
        'change .import-form-file': 'importFeed',
        'click .feed, .folder-text, .all-items': 'filter',
        'click .minimize': 'minimize',
        'click .edit': 'edit',
        'click .delete': 'deleteFeed',
        'click': 'maximize'
    },

    initialize: function () {
        this.model.bind("add", this.render, this)
        _.bindAll(this, 'addFeedToggle', 'edit', 'deleteFeed', 'submitFeed', 'importToggle', 'importFeed', 'refresh')
        this.minimized = false
        this.editing = false
        this.adding = false
        this.importing = false
        vent.on('Feed:refreshed', function(){
            this.$('.refresh').html('refresh')
        }.bind(this))
    },
    addFeedToggle: function (ev) {
        if(this.adding){
            this.$('.add-feed-form').fadeOut(1000)
            this.adding = false
        } else {
            this.$('.add-feed-form').show()
            this.adding = true
        }
    },
    refresh: function(ev) {
         $(ev.target).html('reloading...')
         vent.trigger('Unread:reload')
    },
    submitFeed: function(ev){
        ev.preventDefault()
        var data = $(ev.target).serializeArray()
        var url = data[0].value
        var folder = data[1].value
        this.addFeedToggle()
        this.subscribeFeed(url, folder)
    },
    subscribeFeed: function(url, folder){
        var self = this
        if (!url) return
        var req = {}
        req.feedurl = url
        if (folder) req.folder = folder
        
        $.post('/subscription/subscribe', req, function (res) {
            if (res.err) {
                return vent.trigger('Error:err', res.err)
            }
            self.model.fetch()
        })
    },
    importToggle: function(ev){
        if (!(window.File && window.FileReader && window.FileList)) {
            return vent.trigger('Error:err', 'The File APIs are not fully supported in this browser')
        } 
        if(this.importing){
            this.$('.import-form').fadeOut(10000)
            this.importing = false
        } else {
            this.$('.import-form').show()
            this.importing = true
        }
    },
    importFeed: function(ev){
        var self = this
        var file = ev.target.files[0]
        if(!file || !file.type.match('xml.*')){
           return vent.trigger('Error:err', 'Please select an XML file exported from google reader')
        }
        var reader = new FileReader()
        reader.onload = function(e){
            var xml = e.target.result
            var parser= new DOMParser();
            var parsed = $(parser.parseFromString(xml, 'text/xml'))
            self.$('.import-form').html('Subscribing... This may take a while (~5min), depending on the number of subscriptions')
            self.importToggle()
            parsed.find('outline[type=rss]').each(function(i,out){
                var url = out.getAttribute('xmlUrl')
                var folder = out.parentElement.getAttribute('text')
                self.subscribeFeed(url, folder)
            })
        }
        reader.readAsText(file)
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
    edit: function (ev) {
        var target = $(ev.target)
        this.editing = !this.editing
        this.render()
    },
    reload: function () {
        this.model.fetch({
            success: function () {
                this.render()
            }.bind(this)
        })
    },
    //TODO fix duplicate code with filter
    //TODO delete in bulk from folder instead of one at a time
    deleteFeed: function (ev) {
        var target = $(ev.target)
        var type = target.data('type')
        if (type === 'feed') {
            var feedId = target.data('id')
            $.post('/subscription/unsub', {
                feedId: feedId
            }, function (res) {
                if (res.err) {
                    return vent.trigger('Error:err', res.err)
                }
                vent.trigger('Unread:reload')
                this.reload()
            }.bind(this))
        } else if (type === 'folder') {
            var folder = target.parent()
            var feedIds = []
            folder.children('.feed').each(function (i, feed) {
                feedIds.push(feed.getAttribute('data-id'))
            })
            var currentCount = 0

            var check = function () {
                if (currentCount === feedIds.length) {
                    vent.trigger('Unread:reload')
                    this.reload()
                }
            }.bind(this)
            feedIds.forEach(function (feedId) {
                $.post('/subscription/unsub', {
                    feedId: feedId
                }, function (res) {
                    currentCount += 1
                    check()
                    if (res.err) {
                        return vent.trigger('Error:err', res.err)
                    }
                })
            })
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
            minimized: this.minimized,
            editing: this.editing
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