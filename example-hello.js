const m = require('appmgr').create()

m.app.get('/', async (req, res) => {
  res.send('<p>Hello</p>')
})
