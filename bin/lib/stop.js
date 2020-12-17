//////////////////////////////////////////////////////////////////////
//
// Function: stop
//
// Stops the Place server daemon.
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')

const status = require('../lib/status')
const clr = require('../../lib/clr')

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

module.exports = stop
