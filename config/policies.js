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
        logout: true
    },
    FeedController: {
        '*': false,
    },
    FeedItemController: {
        '*': false,
        show: true
    },
    HomeController: {
        '*': false,
        index: true
    },
    SubscriptionController: {
        '*': false,
        feeds: true,
        unread: true,
        markRead: true,
        subscribe: true,
        unsub: true
    },
    UserController: {
        '*': false
    }
};