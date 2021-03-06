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
        vent.on('Unread:reload', this.reload.bind(this))
        this.selected = null
        _.bindAll(this, 'loopUnread')
    },
    applyFilter: function (filter) {
        vent.trigger('Unread:loading')
        var self = this
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
        var promises = []
        this.loopUnread(function (unread) {
            // decide whether to show item or not
            if (this.currentFilter(unread)) {
                if (!unread.get('loaded') && currentCount < this.preloadCount) {
                    //load feed item
                    promises.push($.Deferred(function (defer) {
                        $.getJSON('/feeditem/' + unread.get('feedItemId'), (function (unread) {
                            return function (res) {
                              if (res.err) {
                                    return vent.trigger('Error:err', res.err)
                                }
                              
                              $.getJSON('/subscription/classify', {feedItemId: unread.get('feedItemId') }, function(classification){
                                if (classification.err) {
                                    return vent.trigger('Error:err', res.err)
                                }
                                
                                for (var key in res) {
                                    unread.set(key, res[key])
                                }
                                unread.set('loaded', true)
                                unread.set('visible', true)
                                unread.set('interesting', classification.interesting)
                                defer.resolve()
                              })
                              
                                
                                
                            }
                        })(unread))
                    }).promise())
                    currentCount++
                }
                unread.set('filter', true)

            } else {
                unread.set('filter', false)
            }
        }.bind(this))
        if (currentCount === 0) {
            //TODO: fix this hack, use socket.io for pushing
            //setTimeout(function () {
            //    this.reload()
            //}.bind(this), 1000)
        }
        $.when.apply(null, promises).done(function () {
            self.trigger('filterUpdate')
            vent.trigger('Unread:count', self.getUnread())
        })
        //this.trigger('filterUpdate')
    },
    getUnread: function () {
        return this.models.filter(function (model) {
            return model.get('filter') && !model.get('read')
        }).length
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
            if (!this.selected.get('read')) {
                this.markRead(this.selected)
            }
            this.selected.set('selected', true)
            this.selected.set('visible', true)
            this.selected.set('read', true)

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
            this.reload()
        }
        vent.trigger('Unread:count', this.getUnread())
    },
    markRead: function (node) {
        $.post('/subscription/markRead', {
            feedItemId: node.get('feedItemId'),
            interesting: node.get('interesting') || false
        }, function (res) {
            if (res.err) {
                return vent.trigger('Error:err', res.err)
            }
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
    reload: function () {
        this.fetch({
            success: function () {
                vent.trigger('Unread:update')
                vent.trigger('Feed:refreshed')
            }
        })
    },
    loopUnread: function (fn) {
        var unreads = this.models
        for (var i = unreads.length - 1; i >= 0; i--) {
            var unread = unreads[i]
            fn(unread)
        }
    },
    interest: function (id) {
        var model = this.get({
            id: id
        });
        
        // if marked read already, server needs to update history
        if (!model.get('interesting') && model.get('read')) {
            $.post('/subscription/markInteresting', {
                feedItemId: model.get('feedItemId')
            }, function (res) {
                if (res.err) {
                    return vent.trigger('Error:err', res.err)
                }
                console.log('interest', res)
            })
        } 
        // otherwise send it on mark read
        model.set('interesting', true);
    }
})

// TODO: efficient add/remove, instead of reloading entire view
UnreadCollectionView = Backbone.View.extend({
    template: _.template($('#main-view').html()),
    events: {
        'click .unread-item': 'selectUnread',
        'click .unread-item a': 'logInterest',
        'mousedown .unread-item a': 'logInterest'
    },
    initialize: function () {
        //this.model.bind("add", this.update, this)
        vent.on('Unread:update', this.update.bind(this))
        vent.on('Unread:loading', function () {
            this.render({
                loading: true
            })
        }.bind(this))
        this.model.bind("filterUpdate", this.render, this)
        $(document).bind('keydown', this.keydown.bind(this))
    },
    render: function (data) {
        console.log('rendering')
        var rend = {
            items: this.model.toJSON(),
            loading: data && data.loading
        }
        $(this.el).html(this.template(rend))
        $('.selected a').focus()
        return this
    },
    update: function () {
        console.log('applying filter')
        this.model.applyFilter()
    },
    logInterest: function (ev) {
        var id = ev.target.parentElement.getAttribute('data-id')
        this.model.interest(id)
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