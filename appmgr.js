const express = require('express')
const logger = require('morgan')
const debug = require('debug')('appmgr')
const H = require('escape-html-template-tag')
const fs = require('fs')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')

/*
  Properties / Options:

  port = number, 0 for dynamic, undefined for process.env.PORT or 8080
  siteurl = something like "https://host.com/data", prepended to all self URLs
  server = becomes the net.Server created, good for .close()
  app = becomes the express app created

*/
class AppMgr {
  constructor (options) {
    const appmgr = this
    appmgr.H = H // just make H really handy for folks

    Object.assign(appmgr, options)
    if (!this.stopHooks) this.stopHooks = []
    if (!this.dirname) {
      // should be relative to source code, not execution directory
      this.dirname = process.cwd() 
      console.warn('dirname not specified, using CWD ' + this.dirname)
    }

    if (!appmgr.datasets) appmgr.datasets = new Map()

    if (appmgr.port === undefined) {
      appmgr.port = process.env.PORT
      if (appmgr.port === undefined) appmgr.port = 8080
      // if it's 0 it'll be changed when the listen completes
    }
    if (!appmgr.siteurl) {
      appmgr.siteurl = process.env.SITEURL
    }

    // apps need some flag like this to know whether to get
    // remote ip from connection or x-forwarded-for.  Could be
    // guessed at from siteurl, maybe.
    if (!appmgr.proxied) {
      appmgr.proxied = process.env.PROXIED
    }

    if (appmgr.app) throw Error('this is only a return value')
    if (appmgr.server) throw Error('this is only a return value')

    const app = express()
    app.H = H
    appmgr.app = app
    app.mgr = appmgr // maybe I should just be extending app

    if (this.logger === undefined) this.logger = logger
    if (this.logger) {
      if (process.env.NODE_ENV === 'PRODUCTION') {
        app.use(this.logger('production'))
      } else {
        app.use(this.logger('dev'))
      }
    }

    const HClass = H``.constructor.name

    app.use(cors())
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))

    appmgr.static = express.static
    app.use('/static', express.static(path.join(this.dirname, 'static'), {
      extensions: ['html', 'png', 'trig', 'nq', 'ttl', 'json', 'jsonld', 'txt'],
      setHeaders: function (res, path, stat) {
        if (path.endsWith('.trig')) res.set('Content-Type', 'application/trig')
      }
    }))

    app.use('/', (req, res, next) => {
      // let all the handlers know the appmgr
      req.appmgr = appmgr

      // /* why doesn't this work?  the call to realSend hangs

      // override send to convert H`...` items to string
      // so they're not sent as JSON
      const realSend = res.send.bind(res)
      res.send = (x, ...rest) => {
        if (x === undefined) throw RangeError('cant send() undefined value')
        if (x.constructor && x.constructor.name === HClass) x = x.toString()
        return realSend(x, ...rest)
      }

      next()
    })

    // app.use('/', routes)
    // common bug for me is to forget to call server.start
    if (!this.manualStart) {
      process.nextTick(() => this.start())
    }

    // you can await appmgr.closed, good for test
    this.closed = new Promise(resolve => {
      this.closed_resolve = resolve
    })
  }

  async stop () {
    // console.log('stopping appmgr')
    for (const hook of this.stopHooks) {
      // console.log('running hook %O', hook)
      await hook()
      // console.log('ran hook %O', hook)
    }
    // or in parallel?   no, we want to close DBs before RMing dirs, etc
    // await Promise.all(this.stopHooks.map(hook => hook()))
    
    await new Promise((resolve, reject) => {
      this.server.close(resolve)
    })
    // console.log('stopped appmgr')
    this.closed_resolve()
  }

  start () {
    const appmgr = this

    // make it fine to call start repeatedly
    if (this.started) return Promise.resolve()
    this.started = true

    this.load() // just start the loading async
    return new Promise((resolve, reject) => {
      fs.readFile('/sites/footer', 'utf8', (err, data) => {
        if (err) {
          data = `
<footer>
  <p><b>Do not use this website unless you are authorized by its owner. This website is not suitable for public use at this time. Unauthorized use might harm you, might harm other people, and might be a crime.</b></p>
</footer>`
        }
        data = H.safe(data)
        appmgr.footer = data
        appmgr.app.footer = data

        // could move this to after the data is loaded if we want, but
        // eventually we'll be doing dynamic loading, I expect
        appmgr.server = appmgr.app.listen(appmgr.port, arg => {
          appmgr.port = appmgr.server.address().port
          if (!appmgr.siteurl) {
            appmgr.siteurl = `http://localhost:${appmgr.port}`
          }

          debug(`server started at `, appmgr.siteurl)
          if (!this.silent) {
            console.log(`# server started at ${appmgr.siteurl}`)
          }
          resolve()
        })
      })
    })
  }

  async load () {
    // const appmgr = this
  }
}

AppMgr.H = H
AppMgr.create = (...args) => new AppMgr(...args)

AppMgr.startServer = async (options = {}) => {
  const appmgr = new AppMgr({...options, manualStart: true})
  await appmgr.start()
  debug('waiting at', appmgr.sitsurl)

  // appmgr.stopHooks.push(...)
  return appmgr
}

module.exports = AppMgr
