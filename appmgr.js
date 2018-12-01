const express = require('express')
const logger = require('morgan')
const debug = require('debug')('appmgr')
const H = require('escape-html-template-tag')

/*
  Properties / Options:

  port = number, 0 for dynamic, undefined for process.end.PORT or 8080
  siteurl = something like "https://host.com/data", prepended to all self URLs
  server = becomes the net.Server created, good for .close()
  app = becomes the express app created

*/
class AppMgr {
  constructor (options) {
    const appmgr = this
    appmgr.H = H // just make H really handy for folks

    Object.assign(appmgr, options)

    if (!appmgr.datasets) appmgr.datasets = new Map()

    if (appmgr.port === undefined) {
      appmgr.port = process.env.PORT
      if (appmgr.port === undefined) appmgr.port = 8080
      // if it's 0 it'll be changed when the listen completes
    }
    if (!appmgr.siteurl) {
      appmgr.siteurl = process.env.SITEURL
    }

    if (appmgr.app) throw Error('this is only a return value')
    if (appmgr.server) throw Error('this is only a return value')

    const app = express()
    appmgr.app = app

    if (process.env.NODE_ENV === 'PRODUCTION') {
      app.use(logger('production'))
    } else {
      app.use(logger('dev'))
    }

    const HClass = H``.constructor.name

    app.use('/static', express.static('static', {
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
  }

  stop () {
    return new Promise((resolve, reject) => {
      this.server.close(resolve)
    })
  }

  start () {
    // make it fine to call start repeatedly
    if (this.started) return Promise.resolve()
    this.started = true

    this.load() // just start the loading async
    return new Promise((resolve, reject) => {
      const appmgr = this

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
  }

  async load () {
    // const appmgr = this
  }
}

AppMgr.H = H
AppMgr.create = (...args) => new AppMgr(...args)
module.exports = AppMgr
