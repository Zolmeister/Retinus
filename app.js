// Start sails and pass it command line arguments
require('sails').lift(require('optimist').argv)

// Start feed consumer

var cp = require('child_process')
GLOBAL.feedDaemon = cp.fork(__dirname + '/feeder.js')