'use strict'
const test = require('tap').test
const RunQueue = require('../queue.js')

test('concur', t => {
  t.plan(10)

  const queue1 = new RunQueue()
  const finished1 = []
  setup(queue1, finished1)
  const queue1complete = queue1.run()
  t.is(queue1.run(), queue1complete, 'multiple run calls get the same promise')
  queue1complete.then(() => {
    t.isDeeply(finished1, [ 0, 1, 2, 3, 4, -1 ], 'concurrency 1')
    t.is(queue1.run(), queue1complete, 'multiple run calls get the same promise, even after completion')
  })

  const queueReprio = new RunQueue({
    maxConcurrency: 1
  })
  const finishedReprio = []

  queueReprio.add(2, () => Promise.resolve(finishedReprio.push(1)))
  queueReprio.add(2, () => Promise.resolve(finishedReprio.push(2)))
  queueReprio.add(2, () => {
    queueReprio.add(1, () => Promise.resolve(finishedReprio.push('a')))
    queueReprio.add(1, () => Promise.resolve(finishedReprio.push('b')))
    return Promise.resolve(finishedReprio.push(3))
  })
  queueReprio.add(2, () => Promise.resolve(finishedReprio.push(4)))
  queueReprio.add(2, () => Promise.resolve(finishedReprio.push(5)))
  queueReprio.run().then(() => {
    t.isDeeply(finishedReprio, [1,2,3,'a','b',4,5], 'higher prio tasks trump lower, even at runtime')
  })

  const queue10 = new RunQueue({
    maxConcurrency: 10
  })
  const finished10 = []
  setup(queue10, finished10)
  queue10.run().then(() => {
    t.isDeeply(finished10, [ 4, 3, 2, 1, 0, -1 ], 'concurrency 10')
  })

  const queueE = new RunQueue({
    maxConcurrency: 3
  })
  queueE.add(0, () => {
    throw new Error('STOP!')
  })
  const finishedE = []
  setup(queueE, finishedE)
  queueE.run().then(() => {
    t.fail('got early error')
  }, function (err) {
    t.is(err && err.message, 'STOP!', 'got early error')
    t.isDeeply(finishedE, [ ], 'no results on early error')

    try {
      queueE.add(0, () => {}, [])
      t.fail('throw on add to finished queue')
    } catch (ex) {
      t.pass('throw on add to finished queue')
    }
  })

  t.throws(() => queueE.run('abc'))

  t.throws(() => queueE.add(-1))
})

function setup (queue, finished) {
  queue.add(1, example(finished), [-1])
  for (let ii = 0; ii < 5; ++ii) {
    queue.add(0, example(finished), [ii])
  }
}

function example (finished) {
  return function (num) {
    return new Promise(function (resolve) {
      setTimeout(() => {
        finished.push(num)
        resolve()
      }, (5 - Math.abs(num)) * 10)
    })
  }
}
