////////////////////////////////////////////////////////////////////////////////
//
// Load HTTPS GET routes from the specified directory and add them to
// to the specified Express application.
//
////////////////////////////////////////////////////////////////////////////////

import getRoutes from '@small-tech/web-routes-from-files'
import asyncForEach from './async-foreach.js'
import clr from './clr.js'

export default async function(httpsGetRoutesDirectory, app) {
  const httpsGetRoutes = getRoutes(httpsGetRoutesDirectory)

  await asyncForEach(httpsGetRoutes, async route => {
    console.log(`   ⛺    ❨Place❩ Adding HTTPS GET route: ${route.path}`)

    // Ensure we are loading a fresh copy in case it has changed.
    const cacheBustingRouteCallback = `${route.callback}?update=${Date.now()}`
    // decache(route.callback)
    try {
      app.get(route.path, (await import(cacheBustingRouteCallback)).default)
    } catch (error) {
      if (error.message.includes('requires a callback function but got a [object Object]')) {
        console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not find callback in route ${route.path}\n\n         ❨Place❩ ${clr('Hint:', 'green')} Make sure your DotJS routes include a ${clr('module.exports = (request, response) => {}', 'cyan')} declaration.\n`)
      } else {
        console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} ${error}`)
      }
      process.exit()
    }
  })
}
