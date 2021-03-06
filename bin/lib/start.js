//////////////////////////////////////////////////////////////////////
//
// Function: start
//
// Starts the Place server daemon.
//
//////////////////////////////////////////////////////////////////////

import childProcess from 'child_process'
import status from '../lib/status.js'
import clr from '../../lib/clr.js'

function throwError(errorMessage) {
  console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} ${errorMessage}\n`)
  throw new Error(errorMessage)
}

function start () {

  // Note: Ensure that systemctl exists and app is root before calling this function.

  const { isActive, isEnabled } = status()

  if (!isEnabled) {
    throwError('Place daemon is not enabled. Please run place enable to enable it.')
  }

  if (isActive) {
    throwError('Place daemon is already active. Nothing to start.')
  }

  try {
    // Start the web server.
    childProcess.execSync('sudo systemctl start place', {env: process.env, stdio: 'pipe'})
  } catch (error) {
    throwError(`Could not start Place daemon (${error}).`)
  }

  console.log('\n   🎈    ❨Place❩ Place daemon started.\n')
}

export default start
