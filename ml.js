var mongojs = require('mongojs'),
  db = mongojs('retinus', ['history', 'feeditem', 'ml']),
  natural = require('natural'),
  fs = require('fs'),
  url = require('url');

/* // do a JOIN and write to file
console.log('getting history')
db.history.find({sub: '51bd4e7fc5840f1f7d000001'}).toArray(function (err, docs) {
  console.log('getting feed items')
  db.feeditem.find(function (err, items) {

    // merge items and history
    console.log('merging feed items')
    items.forEach(function (item) {
      docs.forEach(function (doc) {
        if (doc.feedItemId.toString() === item._id.toString()) {
          doc.feedItem = item
        }
      })
    })

    docs = docs.filter(function(doc){
      return doc.feedItem && doc.feedItem.summary && doc.feedItem.title
    }).map(function (doc) {
      return {
        feedItemId: doc.feedItemId,
        interesting: doc.interesting,
        feedItem: doc.feedItem,
        _id: doc._id
      }
    })
    
    fs.writeFileSync('save.json', JSON.stringify(docs))

    console.log(docs.filter(function (a) {
      return a.feedItem
    }).slice(0, 2))
    
    process.exit()

  })
})
*/

console.log('loading data')
var docs = JSON.parse(fs.readFileSync('save.json'))
/*
var classifier1 = new natural.BayesClassifier() // summary
var classifier2 = new natural.BayesClassifier() // title
var classifier3 = new natural.BayesClassifier() // links
var testSize = 100
var sampleSize = docs.length - testSize - 3510
var linkHistory = {}

// Here we train the calssifiers / history ticker
console.log('training', sampleSize)
for(var i=testSize;i<sampleSize+testSize;i++) {
  
  // train history based on hostname
  var hostname = url.parse(docs[i].feedItem.link).hostname.replace(/\./g,'_')
  classifier3.addDocument([hostname], docs[i].interesting)
  
  // bayes text classifiers
  classifier1.addDocument(docs[i].feedItem.summary.toLowerCase(), docs[i].interesting)
  classifier2.addDocument(docs[i].feedItem.title.toLowerCase(), docs[i].interesting)
}

console.log('training bayes classifier')
classifier1.train()
classifier2.train()
classifier3.train()
console.log('testing')

var testData = [] // guessed results
var testAns = [] // expected results
for(var i=0;i<testSize;i++) {
  var hostname = url.parse(docs[i].feedItem.link).hostname.replace(/\./g,'_')

  var tag1 = classifier1.classify(docs[i].feedItem.summary.toLowerCase())
  var tag2 = classifier2.classify(docs[i].feedItem.title.toLowerCase())
  var tag3 = classifier3.classify(hostname)
  
  testData.push(tag1 === 'true' && tag3 === 'true' || tag2 === 'true'  ? true : false)
  testAns.push(docs[i].interesting)
}

var correct = 0
var falseNegs = 0
for(var i=0;i<testData.length;i++) {
  if(testData[i] === testAns[i]) correct++
  if(testData[i] !== testAns[i] && testAns[i]) falseNegs++
}
console.log('----- Results -----')
console.log(correct, 'correct out of', testData.length)
console.log(correct/testData.length*100, '%')
console.log('false negatives', falseNegs)
console.log('trues in guessed test results', testData.reduce(function(b, r){return b+(r? 1:0)}, 0))
console.log('trues in correct test results', testAns.reduce(function(b, r){return b+(r? 1:0)}, 0))
*/

/*
console.log('INSERTING TO DB')
db.ml.insert({
  sub: '51bd4e7fc5840f1f7d000001',
  summaryClassifier: classifier1,
  titleClassifier: classifier2,
  linkClassifier: classifier3
}, function(err, res){
  if(err) return console.log(err)
  console.log('Done')
})*/

// testing DB learner
var testSize = 100
var testData = [] // guessed results
var testAns = [] // expected results
db.ml.findOne({sub: '51bd4e7fc5840f1f7d000001'}, function(err, zolmeisterML){
  
  var classifier1 = natural.BayesClassifier.restore(zolmeisterML.summaryClassifier)
  var classifier2 = natural.BayesClassifier.restore(zolmeisterML.titleClassifier)
  var classifier3 = natural.BayesClassifier.restore(zolmeisterML.linkClassifier)
  console.log('testing')
  
  var testData = [] // guessed results
  var testAns = [] // expected results
  for(var i=0;i<testSize;i++) {
    var hostname = url.parse(docs[i].feedItem.link).hostname.replace(/\./g,'_')
  
    var tag1 = classifier1.classify(docs[i].feedItem.summary.toLowerCase())
    var tag2 = classifier2.classify(docs[i].feedItem.title.toLowerCase())
    var tag3 = classifier3.classify(hostname)
    
    testData.push(tag1 === 'true' && tag3 === 'true' || tag2 === 'true'  ? true : false)
    testAns.push(docs[i].interesting)
  }
  
  var correct = 0
  var falseNegs = 0
  for(var i=0;i<testData.length;i++) {
    if(testData[i] === testAns[i]) correct++
    if(testData[i] !== testAns[i] && testAns[i]) falseNegs++
  }
  console.log('----- Results -----')
  console.log(correct, 'correct out of', testData.length)
  console.log(correct/testData.length*100, '%')
  console.log('false negatives', falseNegs)
  console.log('trues in guessed test results', testData.reduce(function(b, r){return b+(r? 1:0)}, 0))
  console.log('trues in correct test results', testAns.reduce(function(b, r){return b+(r? 1:0)}, 0))
})
