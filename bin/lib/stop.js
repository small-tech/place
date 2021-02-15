//////////////////////////////////////////////////////////////////////
//
// Function: stop
//
// Stops the Place server daemon.
//
//////////////////////////////////////////////////////////////////////

import childProcess from 'child_process'

import status from '../lib/status.js'
import clr from '../../lib/clr.js'

function throwError(errorMessage) {
  console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} ${errorMessage}\n`)
  throw new Error(errorMessage)
}

// Note: Ensure that systemctl exists and app is root before calling this function.
function stop () {

  const { isActive } = status()

  if (!isActive) {
    throwError('Place daemon is not active. Nothing to stop.')
  }

  try {
    // Stop the web server.
    childProcess.execSync('sudo systemctl stop place', {env: process.env, stdio: 'pipe'})
  } catch (error) {
    throwError(`Could not stop Place daemon (${error}).`)
  }

  console.log('\n   🎈    ❨Place❩ Place daemon stopped.\n')
}

export default stop
