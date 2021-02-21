////////////////////////////////////////////////////////////////////////////////
//
// There is no use in starting a server if the domains it will be serving on
// are not reachable. If we do, this can lead to all sorts of pain later on.
// Much better to inform the person early on that there is a problem with the
// domain (possibly a typo or a DNS issue) and to go no further.
//
// That’s what this module does.
//
////////////////////////////////////////////////////////////////////////////////

import http from 'http'
import prepareRequest from 'bent'
import asyncForEach from './async-foreach.js'
import clr from './clr.js'

export default async function (hostname, aliases) {
  // Note: spacing around this emoji is correct. It requires less than the others.
  console.log('   🧚‍♀️  ❨Place❩ Ensuring domains are reachable before starting global server.')

  const reachabilityMessage = 'place-domain-is-reachable'
  const preFlightCheckServer = http.createServer((request, response) => {
    response.statusCode = 200
    response.end(reachabilityMessage)
  })

  await new Promise((resolve, reject) => {
    try {
      preFlightCheckServer.listen(80, () => {
        console.log('   ✨    ❨Place❩ Pre-flight domain reachability check server started.')
        resolve()
      })
    } catch (error) {
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Pre-flight domain reachability server could not be started.\n`)
      process.exit(1)
    }
  })

  const domainsToCheck = [hostname].concat(aliases)

  await asyncForEach(
    domainsToCheck,
    async domain => {
      try {
        console.log (`   ✨    ❨Place❩ Attempting to reach domain ${domain}…`)
        const domainCheck = prepareRequest('GET', 'string', `http://${domain}`)
        const response = await domainCheck()
        if (response !== reachabilityMessage) {
          // If this happens, there is most likely another site running at this domain.
          // We cannot continue.
          let responseToShow = response.length > 100 ? 'response is too long to show' : response
          if (response.includes('html')) {
            responseToShow = `${responseToShow.replace('is', 'looks like HTML and is')}`
          }
          console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Got unexpected response from ${domain} (${responseToShow}).\n`)
          process.exit(1)
        }
        console.log (`   💖    ❨Place❩ ${domain} is reachable.`)
      } catch (error) {
        // The site is not reachable. We cannot continue.
        console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Domain ${domain} is not reachable. (${error.toString().replace(/Error.*?: /, '')})\n`)

        process.exit(1)
      }
    }
  )

  await new Promise((resolve, reject) => {
    preFlightCheckServer.close(() => {
      resolve()
    }, error => {
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not close the pre-flight domain reachability server.\n`)
      process.exit(1)
    })
  })

  console.log('   ✨    ❨Place❩ Pre-flight domain reachability check server stopped.')
}