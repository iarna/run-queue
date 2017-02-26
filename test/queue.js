'use strict'
var test = require('tap').test
var RunQueue = require('../queue.js')

test('concur', function (t) {
  t.plan(7)

  var queue1 = new RunQueue({
    maxConcurrency: 1
  })
  var finished1 = []
  setup(queue1, finished1)
  var queue1complete = queue1.run()
  t.is(queue1.run(), queue1complete, 'multiple run calls get the same promise')
  queue1complete.then(function () {
    t.isDeeply(finished1, [ 0, 1, 2, 3, 4, -1 ], 'concurrency 1')
    t.is(queue1.run(), queue1complete, 'multiple run calls get the same promise, even after completion')
  })

  var queue10 = new RunQueue({
    maxConcurrency: 10
  })
  var finished10 = []
  setup(queue10, finished10)
  queue10.run().then(function () {
    t.isDeeply(finished10, [ 4, 3, 2, 1, 0, -1 ], 'concurrency 10')
  })

  var queueE = new RunQueue({
    maxConcurrency: 3
  })
  queueE.add(0, function () {
    throw new Error('STOP!')
  })
  var finishedE = []
  setup(queueE, finishedE)
  queueE.run().then(function () {
    t.fail('got early error')
    t.fail()
    t.fail()
  }, function (err) {
    t.is(err && err.message, 'STOP!', 'got early error')
    t.isDeeply(finishedE, [ ], 'no results on early error')

    try {
      queueE.add(0, function () {}, [])
      t.fail('throw on add to finished queue')
    } catch (ex) {
      t.pass('throw on add to finished queue')
    }
  })
})

function setup (queue, finished) {
  queue.add(1, example(finished), [-1])
  for (var ii = 0; ii < 5; ++ii) {
    queue.add(0, example(finished), [ii])
  }
}

function example (finished) {
  return function (num) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        finished.push(num)
        resolve()
      }, (5 - Math.abs(num)) * 10)
    })
  }
}
