/*
   run like:

   # debug and manually assigned port
   DEBUG=* PORT=8123 node example-server.js

   # default port 8080, nodemon for trivial live reloads
   nodemon example-server.js

   # dynamically-assigned port
   PORT=0 node example-server.js

   # behind proxy which gives a different siteurl
   # (and in this case using pm2 to make it restartable daemon)
   PORT=1234 SITEURL=https://example.com/foo NODE_ENV=PRODUCTION pm2 example-server.js

*/

const m = require('appmgr').create()

m.app.get('/', async (req, res) => {
  res.send('<p>Hello</p>')
})

m.app.get('/js', async (req, res) => {
  res.send({ x: 1, y: 2, now: new Date() })
})

m.app.get('/about', async (req, res) => {
  res.send(m.H`<p>This is ${m.siteurl}</p>

Try <a href="${m.siteurl + '/q?html=<b>hi</b>'}">link</a>
`)
})

m.app.get('/q', async (req, res) => {
  const util = require('util')
  res.send(m.H`
<p>Query was ${util.format('%O', req.query)}</p>

<p>Query parameter "html" was: ${req.query.html}</p>
`)
})
