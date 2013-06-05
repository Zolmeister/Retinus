/**
* Policy defines middleware that is run before each controller/controller.
* Any policy dropped into the /middleware directory is made globally available through sails.middleware
* Below, use the string name of the middleware
*/
module.exports.policies = {

	AuthController: {
        '*': false,
        signup: true,
        login: true,
        logout: 'authenticated'
    },
    FeedController: {
        '*': false,
    },
    FeedItemController: {
        '*': false,
        show: 'authenticated'
    },
    HomeController: {
        '*': false,
        index: true
    },
    SubscriptionController: {
        '*': false,
        feeds: 'authenticated',
        unread: 'authenticated',
        markRead: 'authenticated',
        subscribe: 'authenticated',
        unsub: 'authenticated'
    },
    UserController: {
        '*': false
    }
};