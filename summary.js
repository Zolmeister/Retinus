var spawn = require('child_process').spawn

var summarizer = spawn('./summarizer.py')
summarizer.stdin.write('http://www.zolmeister.com/\n')
summarizer.stdout.on('data', function (data) {
  console.log('got summary: ' + data);
});

summarizer.stderr.on('data', function (data) {
  console.log('error getting feed: ' + data);
});