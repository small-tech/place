////////////////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Unit tests: Place.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////

const test = require('tape')

const Place = require('../index.js')
const http = require('http')
const https = require('https')

const fs = require('fs-extra')
const path = require('path')

const queryString = require('querystring')

const WebSocket = require('ws')

process.env['QUIET'] = true

function localhost(path) {
  return `https://localhost${path}`
}

function dehydrate (str) {
  if (typeof str !== 'string') {
    str = str.toString('utf-8')
  }
  return str.replace(/\s/g, '')
}

async function secureGet (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const statusCode = response.statusCode
      const location = response.headers.location
      const contentType = response.headers['content-type']

      // Reject if it’s not one of the status codes we are testing.
      if (statusCode !== 200 && statusCode !== 404 && statusCode !== 500 && statusCode !== 302) {
        reject({statusCode})
      }

      let body = ''
      response.on('data', _ => body += _)
      response.on('end', () => {
        resolve({statusCode, contentType, location, body})
      })
    })
  })
}


async function securePost (hostname, path, data = {}, isJSON = false) {
  return new Promise((resolve, reject) => {

    const encodedData = isJSON ? JSON.stringify(data) : queryString.stringify(data)

    const options = {
      hostname,
      path,
      port: 443,
      method: 'POST',
      headers: {
        'Content-Type': isJSON ? 'application/json' : 'application/x-www-form-urlencoded',
        'Content-Length': encodedData.length
      }
    }

    const request = https.request(options, response => {
      const statusCode = response.statusCode
      let body = ''
      response.on('data', (data) => {
        // Note: we should really be parsing querystring data here but our test routes
        // ===== return plain text at the moment. TODO: Update.
        decodedData = isJSON ? JSON.parse(data) : data.toString('utf-8') // queryString.parse(data)
        resolve({statusCode, data: decodedData})
      })
    })

    request.on('error', () => reject(error))

    request.write(encodedData)
    request.end()
  })
}


test('[place] constructor', t => {
  const server = new Place().server
  t.ok(server instanceof https.Server, 'is https.Server')

  server.listen(443, () => {
    t.equal(server.address().port, 443, 'the requested port is set on returned https.Server')
    server.close(() => {
      t.end()
    })
  })
})


test('[place] Simple dotJS filesystem-based route loading', async t => {

  const place = new Place({path: 'test/site-dynamic-dotjs-simple'})

  // Hit the route to ensure we get the response we expect.
  await new Promise(async (resolve, reject) => {
    const server = await place.serve(async () => {
      // Ensure the route is loaded as we expect.
      const routerStack = place.app._router.stack
      t.strictEquals(routerStack[9].route.path, '/simple', 'the route is as expected in the router stack')

      let response
      try {
        response = await secureGet('https://localhost/simple')
      } catch (error) {
        reject(error)
      }

      t.strictEquals(response.statusCode, 200, 'request succeeds')
      t.strictEquals(response.body, 'simple', 'route loads')

      server.close(() => {
        resolve()
      })
    })
  })

  t.end()
})


test('[place] DotJS parameters', async t => {

  const place = new Place({path: 'test/site-dynamic-dotjs-parameters'})

  await new Promise (async (resolve, reject) => {
    const server = await place.serve(async () => {

      let response
      try {
        response = await secureGet('https://localhost/rabbit/Laura')
      } catch (error) {
        console.log(error)
        process.exit(1)
      }

      t.strictEquals(response.statusCode, 200, 'rabbit request succeeds')
      t.strictEquals(response.body, 'The rabbit’s name is Laura.', 'rabbit response is as expected')

      try {
        response = await secureGet('https://localhost/person/philip-pullman/book/his-dark-materials')
      } catch (error) {
        console.log(error)
        process.exit(1)
      }

      t.strictEquals(response.statusCode, 200, 'person request succeeds')
      t.strictEquals(response.body, '{"personId":"philip-pullman","bookId":"his-dark-materials"}', 'person response is as expected')

      server.close(error => {
        if (error) reject(error)
        resolve()
      })
    })
  })

  t.end()
})


// Runs the tests for routes within separate .get and .https folders.
async function runDotJsSeparateGetAndPostTests (t, place) {

  const routerStack = place.app._router.stack

  const getFileNameAsRouteNameRoute = routerStack[9].route
  t.true(getFileNameAsRouteNameRoute.methods.get, 'request method should be GET')
  t.strictEquals(getFileNameAsRouteNameRoute.path, '/file-name-as-route-name', 'path should be correct')

  const getIndexRoute = routerStack[10].route
  t.true(getIndexRoute.methods.get, 'request method should be GET')
  t.strictEquals(getIndexRoute.path, '/', 'path should be correct')

  const getSubRouteFileNameAsRouteNameRoute = routerStack[11].route
  t.true(getSubRouteFileNameAsRouteNameRoute.methods.get, 'request method should be GET')
  t.strictEquals(getSubRouteFileNameAsRouteNameRoute.path, '/sub-route/file-name-as-route-name', 'path should be correct')

  const getSubRouteIndexRoute = routerStack[12].route
  t.true(getSubRouteIndexRoute.methods.get, 'request method should be GET')
  t.strictEquals(getSubRouteIndexRoute.path, '/sub-route', 'path should be correct')

  // Next two routes are the body parser and JSON parser, so we skip those.

  const postFileNameAsRouteNameRoute = routerStack[15].route
  t.true(postFileNameAsRouteNameRoute.methods.post, 'request method should be POST')
  t.strictEquals(postFileNameAsRouteNameRoute.path, '/file-name-as-route-name', 'path should be correct')

  const postIndexRoute = routerStack[16].route
  t.true(postIndexRoute.methods.post, 'request method should be POST')
  t.strictEquals(postIndexRoute.path, '/', 'path should be correct')

  const postSubRouteFileNameAsRouteNameRoute = routerStack[17].route
  t.true(postSubRouteFileNameAsRouteNameRoute.methods.post, 'request method should be POST')
  t.strictEquals(postSubRouteFileNameAsRouteNameRoute.path, '/sub-route/file-name-as-route-name', 'path should be correct')

  const postSubRouteIndexRoute = routerStack[18].route
  t.true(postSubRouteIndexRoute.methods.post, 'request method should be POST')
  t.strictEquals(postSubRouteIndexRoute.path, '/sub-route', 'path should be correct')

  // Hit the routes to ensure we get the responses we expect.
  // (The server has already been started.)

  // So we can access them outside of the try block (scope).
  let getFileNameAsRouteNameRouteResponse, getIndexRouteResponse, getSubRouteFileNameAsRouteNameRouteResponse, getSubRouteIndexRouteResponse, postFileNameAsRouteNameRouteResponse, postIndexRouteResponse,postSubRouteFileNameAsRouteNameRouteResponse, postSubRouteIndexRouteResponse;

  try {
    getFileNameAsRouteNameRouteResponse = await secureGet(localhost(getFileNameAsRouteNameRoute.path))
    getIndexRouteResponse = await secureGet(localhost(getIndexRoute.path))
    getSubRouteFileNameAsRouteNameRouteResponse = await secureGet(localhost(getSubRouteFileNameAsRouteNameRoute.path))
    getSubRouteIndexRouteResponse = await secureGet(localhost(getSubRouteIndexRoute.path))

    postFileNameAsRouteNameRouteResponse = await securePost('localhost', postFileNameAsRouteNameRoute.path)
    postIndexRouteResponse = await securePost('localhost', postIndexRoute.path)
    postSubRouteFileNameAsRouteNameRouteResponse = await securePost('localhost', postSubRouteFileNameAsRouteNameRoute.path)
    postSubRouteIndexRouteResponse = await securePost('localhost', postSubRouteIndexRoute.path)
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  t.strictEquals(getFileNameAsRouteNameRouteResponse.statusCode, 200, 'request succeeds')
  t.strictEquals(getIndexRouteResponse.statusCode, 200, 'request succeeds')
  t.strictEquals(getSubRouteFileNameAsRouteNameRouteResponse.statusCode, 200, 'request succeeds')
  t.strictEquals(getSubRouteIndexRouteResponse.statusCode, 200, 'request succeeds')

  t.strictEquals(postFileNameAsRouteNameRouteResponse.statusCode, 200, 'request succeeds')
  t.strictEquals(postIndexRouteResponse.statusCode, 200, 'request succeeds')
  t.strictEquals(postSubRouteFileNameAsRouteNameRouteResponse.statusCode, 200, 'request succeeds')
  t.strictEquals(postSubRouteIndexRouteResponse.statusCode, 200, 'request succeeds')

  t.strictEquals(getFileNameAsRouteNameRouteResponse.body, 'GET /file-name-as-route-name', 'route loads')
  t.strictEquals(getIndexRouteResponse.body, 'GET /', 'route loads')
  t.strictEquals(getSubRouteFileNameAsRouteNameRouteResponse.body, 'GET /sub-route/file-name-as-route-name', 'route loads')
  t.strictEquals(getSubRouteIndexRouteResponse.body, 'GET /sub-route', 'route loads')

  t.strictEquals(postFileNameAsRouteNameRouteResponse.data, 'POST /file-name-as-route-name', 'route loads')

  t.strictEquals(postIndexRouteResponse.data, 'POST /', 'route loads')
  t.strictEquals(postSubRouteFileNameAsRouteNameRouteResponse.data, 'POST /sub-route/file-name-as-route-name', 'route loads')
  t.strictEquals(postSubRouteIndexRouteResponse.data, 'POST /sub-route', 'route loads')
}


test('[place] Separate .get and .post folders with dotJS filesystem-based route loading', async t => {

  const place = new Place({path: 'test/site-dynamic-dotjs-separate-get-and-post'})
  await place.serve()

  await runDotJsSeparateGetAndPostTests(t, place)

  await new Promise((resolve, reject) => {
    place.server.close(error => {
      if (error) reject(error)
      resolve()
    })
  })

  t.end()
})


test('[place] Separate .https and .wss folders with separate .get and .post folders in the .https folder with dotJS filesystem-based route loading', async t => {

  const place = new Place({path: 'test/site-dynamic-dotjs-separate-https-and-wss-and-separate-get-and-post'})
  await place.serve()

  await runDotJsSeparateGetAndPostTests(t, place)

  // Run the WSS tests.
  const routerStack = place.app._router.stack

  // Indices up to 16 have been covered by runDotJsSeparateGetAndPostTests() above.
  // Index 17 is that static router.
  // The WSS routes start at index 18.

  const webSocketFileNameAsRouteNameRoute = routerStack[20].route
  t.true(webSocketFileNameAsRouteNameRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
  t.strictEquals(webSocketFileNameAsRouteNameRoute.path, '/file-name-as-route-name/.websocket', 'path should be correct')

  const webSocketIndexRoute = routerStack[21].route
  t.true(webSocketIndexRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
  t.strictEquals(webSocketIndexRoute.path, '/.websocket', 'path should be correct')

  const webSocketSubRouteFileNameAsRouteNameRoute = routerStack[22].route
  t.true(webSocketSubRouteFileNameAsRouteNameRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
  t.strictEquals(webSocketSubRouteFileNameAsRouteNameRoute.path, '/sub-route/file-name-as-route-name/.websocket', 'path should be correct')

  const webSocketSubRouteIndexRoute = routerStack[23].route
  t.true(webSocketSubRouteIndexRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
  t.strictEquals(webSocketSubRouteIndexRoute.path, '/sub-route/.websocket', 'path should be correct')

  // Actually test the WebSocket (WSS) routes by connecting to them.
  const testWebSocketPath = (path) => {

    return new Promise((resolve, reject) => {

      const webSocketUrl = `wss://localhost${path}`
      const ws = new WebSocket(webSocketUrl, { rejectUnauthorized: false })

      ws.on('open', () => { ws.send('test') })

      ws.on('message', (data) => {
        ws.close()
        t.strictEquals(data, `${path} test`, 'the correct message is echoed back')
        resolve()
      })

      ws.on('error', (error) => {
        reject(error)
      })
    })
  }

  await testWebSocketPath('/file-name-as-route-name')
  await testWebSocketPath('/')
  await testWebSocketPath('/sub-route/file-name-as-route-name')
  await testWebSocketPath('/sub-route')

  await new Promise ((resolve, reject) => {
    place.server.close(error => {
      if (error) reject(error)
      resolve()
    })
  })

  t.end()
})


test('[place] dynamic route loading from routes.js file', async t => {

  const place = new Place({path: 'test/site-dynamic-routes-js'})
  await place.serve()

  const routerStack = place.app._router.stack

  const getRouteWithParameter = routerStack[12].route
  t.true(getRouteWithParameter.methods.get, 'request method should be GET')
  t.strictEquals(getRouteWithParameter.path, '/hello/:thing', 'path should be correct and contain parameter')

  const wssRoute = routerStack[13].route
  t.true(wssRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
  t.strictEquals(wssRoute.path, '/echo/.websocket', 'path should be correct and contain parameter')

  // Test the GET route with the parameter.
  let response
  try {
    response = await secureGet('https://localhost/hello/world')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  t.strictEquals(response.statusCode, 200, 'request succeeds')
  t.strictEquals(response.body, 'Hello, world!', 'route loads with correct message')

  // Test the WSS route.

  await new Promise ((resolve, reject) => {
    const ws = new WebSocket('wss://localhost/echo', { rejectUnauthorized: false })

    ws.on('open', () => { ws.send('test') })

    ws.on('message', (data) => {
      ws.close()
      t.strictEquals(data, 'test', 'the correct message is echoed back')

      place.server.close(error => {
        if (error) reject(error)
        resolve()
      })
    })
  })

  t.end()
})


test('[place] response.html()', async t => {
  const place = new Place({path: 'test/site-response-html'})
  await place.serve()

  let response
  try {
    response = await secureGet('https://localhost/')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  t.strictEquals(response.statusCode, 200, 'request succeeds')
  t.strictEquals(response.contentType, 'text/html; charset=utf-8', 'response type is HTML')
  t.strictEquals(response.body, 'response.html() works', 'response body is as expected')

  await new Promise ((resolve, reject) => {
    place.server.close(error => {
      if (error) reject(error)
      resolve()
    })
  })

  t.end()
})


test('[place] database', async t => {

  // Delete the existing database if there is one.
  const databasePath = path.join(__dirname, 'site-database', '.db')
  fs.removeSync(databasePath)

  const place = new Place({path: 'test/site-database'})
  await place.serve()

  // On start-up, the database and a table called test should have been created.

  const tablePath = path.join(databasePath, 'test.js')
  t.ok(fs.existsSync(databasePath), 'database is created')
  t.ok(fs.existsSync(tablePath), 'table is created')

  const table = require(tablePath)

  t.ok(Array.isArray(table), 'table is an array')
  t.strictEquals(table.length, 2, 'table has two item')
  t.strictEquals(table[0].name, 'Aral', 'first person’s name is as expected')
  t.strictEquals(table[0].age, 44, 'first person’s initial age is as expected')
  t.strictEquals(table[1].name, 'Laura', 'second person’s name is as expected')
  t.strictEquals(table[1].age, 32, 'second person’s initial age is as expected')

  // Now, let’s hit the index route, which should decrease the first person’s
  // age by one year and increase the second person’s age by one year and
  // return a JSON representation of the latest state of the data.
  let response
  try {
    response = await secureGet('https://localhost')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  t.strictEquals(response.statusCode, 200, 'request succeeds')
  t.strictEquals(response.contentType, 'application/json; charset=utf-8', 'response type is JSON')
  t.strictEquals(response.body, '[{"name":"Aral","age":43},{"name":"Laura","age":33}]', 'table state after call is as expected')

  await new Promise ((resolve, reject) => {
    place.server.close(error => {
      if (error) reject(error)
      resolve()
    })
  })

  t.end()
})

test('[place] wildcard routes', async t => {

  const place = new Place({path: 'test/site-wildcard-routes'})
  await place.serve()

  let response
  try {
    response = await secureGet('https://localhost/hello/there/who/is/this')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  t.strictEquals(response.statusCode, 200, 'wildcard “hello” request succeeds')
  t.strictEquals(dehydrate(response.body).toLowerCase(), dehydrate(`
      <!DOCTYPE html>
      <html lang='en'>
      <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Wildcard: hello</title>
      </head>
      <body>
        <script>
          // Place: add window.routeName and window.arguments objects to wildcard route.
          __place__pathFragments =  document.location.pathname.split('/')
          window.route = __place__pathFragments[1]
          window.arguments = __place__pathFragments.slice(2).filter(value => value !== '')
          delete __place__pathFragments
        </script>
        <script>
          document.write(\`<h1><em>\${window.route}</em> wildcard route</h1>\`)
          document.write('<p>Called with the following arguments:</p>')
          document.write('<ol>')
          window.arguments.forEach(argument => {
            document.write(\`<li>\${argument}</li>\`)
          })
          document.write('</ol>')
        </script>
        <script src="/instant/client/bundle.js"></script>
      </body>
      </html>
  `).toLowerCase(), 'wildcard “hello” route body is as expected')

  // Test routes defined with the name of the HTML file.

  try {
    response = await secureGet('https://localhost/goodbye/see/you/later')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  t.strictEquals(response.statusCode, 200, 'wildcard “goodbye” request succeeds')
  t.strictEquals(dehydrate(response.body).toLowerCase(), dehydrate(`
  <!DOCTYPE html>
  <html lang='en'>
  <head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Wildcard: goodbye</title>
  </head>
  <body>
    <script>
      // Place: add window.routeName and window.arguments objects to wildcard route.
      __place__pathFragments =  document.location.pathname.split('/')
      window.route = __place__pathFragments[1]
      window.arguments = __place__pathFragments.slice(2).filter(value => value !== '')
      delete __place__pathFragments
    </script>
    <script>
      document.write(\`<h1><em>\${window.route}</em> wildcard route</h1>\`)
      document.write('<p>Called with the following arguments:</p>')
      document.write('<ol>')
      window.arguments.forEach(argument => {
        document.write(\`<li>\${argument}</li>\`)
      })
      document.write('</ol>')
    </script>
    <script src="/instant/client/bundle.js"></script>
  </body>
  </html>

  `).toLowerCase(), 'wildcard “goodbye” route body is as expected')

  await new Promise ((resolve, reject) => {
    place.server.close(error => {
      if (error) reject(error)
      resolve()
    })
  })

  t.end()
})


test('[place] serve method default 404 and 500 responses', async t => {
  //
  // Test the default 404 and 500 responses of the serve method.
  //
  // We rename the folders of the custom messages so that they are not used
  // and we rename them back once we’re done.
  //

  const custom404Folder = path.join(__dirname, 'site', '404')
  const backup404Folder = path.join(__dirname, 'site', 'backup-404')

  const custom500Folder = path.join(__dirname, 'site', '500')
  const backup500Folder = path.join(__dirname, 'site', 'backup-500')

  fs.renameSync(custom404Folder, backup404Folder)
  fs.renameSync(custom500Folder, backup500Folder)

  const place = new Place({path: 'test/site'})
  const server = await place.serve()

  // The server is initialised with the default messages. We can now
  // rename the folders back.
  fs.renameSync(backup404Folder, custom404Folder)
  fs.renameSync(backup500Folder, custom500Folder)

  //
  // Test default 404 error.
  //
  let responseDefault404
  try {
    responseDefault404 = await secureGet('https://localhost/this-page-does-not-exist')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  const expectedDefault404ResponseBodyDeflated = '<!doctypehtml><htmllang="en"style="font-family:sans-serif;background-color:#eae7e1"><head><metacharset="utf-8"><metaname="viewport"content="width=device-width,initial-scale=1.0"><title>Error404:Notfound</title></head><bodystyle="display:grid;align-items:center;justify-content:center;height:100vh;vertical-align:top;margin:0;"><main><h1style="font-size:16vw;color:black;text-align:center;line-height:0.25">4🤭4</h1><pstyle="font-size:4vw;text-align:center;padding-left:2vw;padding-right:2vw;"><span>Couldnotfind</span><spanstyle="color:grey;">/this-page-does-not-exist</span></p></main><scriptsrc="/instant/client/bundle.js"></script></body></html>'.replace(/\s/g, '')

  t.equal(responseDefault404.statusCode, 404, 'response status code is 404')
  t.equal(responseDefault404.body.replace(/\s/g, ''), expectedDefault404ResponseBodyDeflated, 'default 404 response body is as expected')

  //
  // Test default 500 error.
  //

  let responseDefault500
  try {
    responseDefault500 = await secureGet('https://localhost/test-500-error')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  const expectedDefault500ResponseBodyDeflated = '<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 500: Internal Server Error</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">5🔥😱</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Internal Server Error</span><br><br><span style="color: grey;">Bad things have happened.</span></p></main></body></html>'.replace(/\s/g, '')

  t.equal(responseDefault500.statusCode, 500, 'response status code is 500')
  t.equal(responseDefault500.body.replace(/\s/g, ''), expectedDefault500ResponseBodyDeflated, 'default 500 response body is as expected')

  await new Promise ((resolve, reject) => {
    place.server.close(error => {
      if (error) reject(error)
      resolve()
    })
  })

  t.end()
})



test('[place] serve method', async t => {
  const place = new Place({path: 'test/site'})
  const server = await place.serve()

  t.ok(server instanceof https.Server, 'is https.Server')

  //
  // Test a valid (200) response.
  //
  let response
  try {
    response = await secureGet('https://localhost/index.html')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  t.equal(response.statusCode, 200, 'request succeeds')
  t.equal(response.body.replace(/\s/g, ''), fs.readFileSync(path.join(__dirname, 'site', 'index.html'), 'utf-8').replace(/\s/g, '').replace('</main></body>', '</main><scriptsrc="/instant/client/bundle.js"></script></body>'), 'index loads')

  //
  // Test custom 404 page.
  //
  let responseCustom404
  try {
    responseCustom404 = await secureGet('https://localhost/this-page-does-not-exist')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  // Load the custom 404 file and carry out the transformations that the 404 route would perform. Then strip
  // it of whitespace and compare to the response we got, also stripped of whitespace.
  const expectedCustom404ResponseBodyDeflated = fs.readFileSync(path.join(__dirname, 'site', '404', 'index.html'), 'utf-8').replace('THE_PATH', '/this-page-does-not-exist').replace('<head>', '<head>\n\t<base href="/404/">').replace(/\s/g, '').replace('</main></body>', '</main><scriptsrc="/instant/client/bundle.js"></script></body>')

  t.equal(responseCustom404.statusCode, 404, 'response status code is 404')
  t.equal(responseCustom404.body.replace(/\s/g, ''), expectedCustom404ResponseBodyDeflated, 'custom 404 response body is as expected')

  //
  // Test custom 500 page.
  //
  let responseCustom500
  try {
    responseCustom500 = await secureGet('https://localhost/test-500-error')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  // Load the custom 500 file and carry out the transformations that the 500 route would perform. Then strip
  // it of whitespace and compare to the response we got, also stripped of whitespace.
  const expectedCustom500ResponseBodyDeflated = fs.readFileSync(path.join(__dirname, 'site', '500', 'index.html'), 'utf-8').replace('THE_ERROR', 'Bad things have happened.').replace('<head>', '<head>\n\t<base href="/500/">').replace(/\s/g, '')

  t.equal(responseCustom500.statusCode, 500, 'response status code is 500')
  t.equal(responseCustom500.body.replace(/\s/g, ''), expectedCustom500ResponseBodyDeflated, 'custom 500 response body is as expected')

  await new Promise ((resolve, reject) => {
    place.server.close(error => {
      if (error) reject(error)
      resolve()
    })
  })

  t.end()
})
