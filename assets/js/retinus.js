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
        if(res.err){
            vent.trigger('Error:err', res.err)
        } else if (res.success) {
            Authed = true
            vent.trigger('Login:logged in')
        }
    },
    close: function () {
        this.remove()
        this.unbind()
    }
})

ErrorView = Backbone.View.extend({
    template: _.template('<%= err %>'),
    events: {
        'click': 'close'
    },
    initialize: function () {
        this.timer = setTimeout(this.close.bind(this), 4000)
    },
    render: function () {
        $(this.el).html(this.template({
            err: this.options.err
        }))
    },
    close: function () {
        this.remove()
        this.unbind()
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
        vent.on('Error:err', function (err) {
            this.error(err)
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
    addView: function(view){
        this.currentViews.push(view)
        view.render()
    },
    error: function (err) {
        console.log('error', err)
        var $el = $('<div class="error">')
        $('.errors').append($el)
        var errView = new ErrorView({
            el: $el,
            err: err
        })
        this.addView(errView)
    },
    home: function () {
        var self = this
        //TODO: fix this hack
        $('.logout').show()
        if (typeof Authed !== "undefined" && !Authed) {
            return this.navigate("login", true)
        }
        var feeds = new FeedCollection()
        var $el = $('<div id="sidebar">')
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
        var $el = $('<div id="login">')
        $('body').append($el)
        var loginView = new LoginView({
            el: $el
        })
        this.showViews(loginView)
    },
    logout: function () {
        $.get('/auth/logout', function (res) {
            if(res.err){
                return vent.trigger('Error:err', res.err)
            }
            Authed = false
            this.navigate('login', true)
        }.bind(this))
    }
})

var vent = _.extend({}, Backbone.Events);
var retinusRoute = new AppRouter(vent)
$(function(){
    Backbone.history.start()
}
