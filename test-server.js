const delay = require('delay')
const test = require('tape')
const got = require('got')
const AppMgr = require('.')
const debug = require('debug')('test')

test(async (t) => {
  const m = new AppMgr({ port: 0 })
  const msg = '<p>hello</p>'
  m.app.get('/hello', (req, res) => {
    debug('request received')
    t.pass()
    res.send(msg)
  })
  await m.start()
  debug('start returned', m.siteurl)
  const back = (await got(m.siteurl + '/hello')).body
  debug('got returned', back)
  t.equal(back, msg)
  await m.stop()
  t.end()
})

test('forget m.start', async (t) => {
  const m = new AppMgr({ port: 0 })
  const msg = '<p>hello</p>'
  m.app.get('/hello', (req, res) => {
    debug('request received')
    t.pass()
    res.send(m.H`<p>hello</p>`)
  })
  await delay(100) // do need the siteurl to be filled in
  const back = (await got(m.siteurl + '/hello')).body
  debug('got returned', back)
  t.equal(back, msg)
  await m.stop()
  t.end()
})

test('force got() to wait', async (t) => {
  const m = new AppMgr({ port: 8973 }) // hope we don't conflict
  const msg = '<p>hello</p>'
  m.app.get('/hello', (req, res) => {
    debug('request received')
    t.pass()
    res.send(msg)
  })
  // DONT wait for m.start()
  const url = 'http://127.0.0.1:' + m.port
  debug('trying', url)
  const back = (await got(url + '/hello')).body
  debug('got returned', back)
  t.equal(back, msg)
  await m.stop()
  t.end()
})

test('static', async (t) => {
  process.env.PORT = '0'
  const m = new AppMgr()
  await m.start()
  const back = (await got(m.siteurl + '/static/ping')).body
  debug('got returned', back)
  t.equal(back, 'pong\n')
  await m.stop()
  t.end()
})

test('static trig', async (t) => {
  process.env.NODE_ENV = 'PRODUCTION'
  const m = new AppMgr({ silent: true })
  await m.start()
  const back = (await got(m.siteurl + '/static/rdf')).body
  debug('got returned', back)
  t.equal(back, '<a> <b> <c>\n')
  await m.stop()
  t.end()
})
