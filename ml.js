var mongojs = require('mongojs'),
  db = mongojs('retinus', ['history', 'feeditem']),
  natural = require('natural'),
  fs = require('fs'),
  svmjs = require('svm'),
  url = require('url'),
  bayes = require('bayes'),
  credulous = require('credulous')

/*
console.log('getting history')
db.history.find().skip(1000).toArray(function (err, docs) {
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

var classifier = new natural.BayesClassifier()
var classifierTitle = new natural.BayesClassifier()
var testSize = 50
var sampleSize = docs.length - testSize - 3510
var linkHistory = {}
var svm = new svmjs.SVM()
var svmTrainData = []
var svmLabels = []

// Here we train the calssifiers / history ticker
console.log('training', sampleSize)
for(var i=testSize;i<sampleSize+testSize;i++) {
  
  // train history
  //var hostname = url.parse(docs[i].feedItem.link).hostname
  //if(!linkHistory[hostname]) linkHistory[hostname] = {clicks: 0, total: 0}
  //linkHistory[hostname].total++
  //docs[i].interesting && linkHistory[hostname].clicks++
  
  // bayes classifier
  classifier.addDocument(docs[i].feedItem.summary.toLowerCase(), docs[i].interesting ? 'read' : 'skip')
  classifier.addDocument(docs[i].feedItem.title.toLowerCase(), docs[i].interesting ? 'read' : 'skip')
  //classifier.addDocument(docs[i].feedItem.description.toLowerCase(), docs[i].interesting ? 'read' : 'skip')
 

}

// finish training the bayes classifier, to be used in the svm
console.log('training bayes classifier')
classifier.train()

// Now, we feed raw scores from all features into the svm trainig data
for(var i=testSize;i<sampleSize+testSize;i++) {
  
  // history
  //var hostname = url.parse(docs[i].feedItem.link).hostname
  //var ratio = linkHistory[hostname].clicks / linkHistory[hostname].total
  
  // if a link doesn't have a at least 20 entries, ignore the raio (set to 50%)
  //if(linkHistory[hostname].total < 20) ratio = 0.5
  
  // bayes score
  //var tag = classifier.classify(docs[i].feedItem.summary.toLowerCase()) ? 'read': 'skip'
  var score = classifier.getClassifications(docs[i].feedItem.summary.toLowerCase())
  var tag = score[0].value > score[1].value*10000 ? 'read': 'skip'
  //svmTrainData.push([tag==='read'? 1 : -1 ])
  svmTrainData.push([docs[i].interesting ? 1 : 0])
  svmLabels.push(docs[i].interesting ? 1 : 0)
}
console.log('svm training labels (correct answers')
console.log(JSON.stringify(svmLabels))
console.log('svm train data (classifying already classified data)')
console.log(JSON.stringify(svmTrainData))

//classifierTitle.train()
svm.train(svmTrainData, svmLabels, {C: 1.0, numpasses: 100, tol: 1e-5, maxiter: 1e6})
console.log('testing')


// Now we have a trained SVM, lets predict
var testData = []
var testAns = []
for(var i=0;i<testSize;i++) {
  //var hostname = url.parse(docs[i].feedItem.link).hostname
  //var hist = linkHistory[hostname]
  //var ratio = hist && hist.clicks / hist.total
  
  // if a link doesn't have a at least 20 entries, ignore the raio (set to 50%)
  //if(!hist || hist.total < 20) ratio = 0.5

  //var tag = classifier.classify(docs[i].feedItem.summary.toLowerCase())
  var score = classifier.getClassifications(docs[i].feedItem.summary.toLowerCase())
  var tag = score[0].value > score[1].value*10000 ? 'read': 'skip'
  //testData.push([tag==='read'? 1 : -1 ])
  testData.push(docs[i].interesting ? 1 : -1)
  testAns.push(docs[i].interesting ? 1 : -1)
}
console.log('This is the result of the bayes classifier')
console.log(JSON.stringify(testData))
console.log('These are the correct labeled answers')
console.log(JSON.stringify(testAns))

var answers = svm.predict(testData)
console.log('This is what the svm spits out')
console.log(JSON.stringify(answers))

// now lets check the svm results
var correct = 0
var falseNegs = 0
for(var i=0;i<answers.length;i++) {
  if(answers[i] === testAns[i]) correct++
  if(answers[i] !== testAns[i] && testAns[i] === 1) falseNegs++
}
console.log('----- Results -----')
console.log(correct, 'correct out of', answers.length)
console.log(correct/answers.length*100, '%')
console.log('false negatives', falseNegs)
console.log('1s', answers.reduce(function(b, r){return b+(r==1? 1:0)}, 0))
console.log('1s in doc', docs.slice(testSize, sampleSize+testSize).reduce(function(b, r){
  return b+(r.interesting?1:0)
},0))
console.log('1s in correct labels', testAns.reduce(function(b, r){return b+(r==1? 1:0)}, 0))
//console.log('svm results:', answers)


/*var correct = 0
var correctTitle = 0
var correctTotal = 0

for(var i=0;i<testSize;i++) {
  
  
  
  // summary
  /*var scores = classifier.classify(docs[i].feedItem.summary)
  if(scores[0].label === 'read'){
    var read = scores[0], skip = scores[1]
  } else {
    var read = scores[1], skip = scores[0]
  }
  
  // weight skips at half
  var tag = (skip/2 < read)  ? true : false
  if(tag === docs[i].interesting) correct++*/
  
  
  /*// title
  var scores = classifierTitle.classify(docs[i].feedItem.title)
  if(scores[0].label === 'read'){
    var read = scores[0], skip = scores[1]
  } else {
    var read = scores[1], skip = scores[0]
  }
  
  // weight skips at half
  var tag2 = (skip/2 < read)  ? true : false
  if(tag2 === docs[i].interesting) correctTitle++
  
  var total = tag2 || tag
  if(total === docs[i].interesting) correctTotal++*/
//}
//console.log('summary correct: ', correct, 'percent: ', correct/testSize*100, '%')
//console.log('title   correct: ', correctTitle, 'percent: ', correctTitle/testSize*100, '%')
//console.log('total   correct: ', correctTotal, 'percent: ', correctTotal/testSize*100, '%')

/*
console.log(docs.filter(function (a) {
  return a.feedItem
}).slice(0, 2))
*/
