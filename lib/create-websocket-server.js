////////////////////////////////////////////////////////////////////////////////
//
// Creates a WebSocket server, loads in the WebSocket routes, and
// add them to the specified Express app.
//
////////////////////////////////////////////////////////////////////////////////

import expressWebSocket from '@small-tech/express-ws'
import getRoutes from '@small-tech/web-routes-from-files'
import asyncForEach from './async-foreach.js'

export default async function (app, server, wssRoutesDirectory) {
  expressWebSocket(app, server, { perMessageDeflate: false })

  const wssRoutes = getRoutes(wssRoutesDirectory)

  await asyncForEach(wssRoutes, async route => {
    console.log(`   ⛺    ❨Place❩ Adding WebSocket (WSS) route: ${route.path}`)
    // Ensure we are loading a fresh copy in case it has changed.
    const cacheBustingRouteCallback = `${route.callback}?update=${Date.now()}`
    app.ws(route.path, (await import(cacheBustingRouteCallback)).default)
  })
}
