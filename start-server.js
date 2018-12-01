#!/usr/bin/env node

const AppMgr = require('./appmgr')

const m = new AppMgr()
m.start().then(() => {
  console.log(`# Server listening at ${m.siteurl}`)
})
