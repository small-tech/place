//////////////////////////////////////////////////////////////////////
//
// Function: disable
//
// Disables the Place server daemon (stops it and removes it
// from startup items).
//
//////////////////////////////////////////////////////////////////////

import fs from 'fs'
import childProcess from 'child_process'
import status from '../lib/status.js'
import Place from '../../index.js'
import clr from '../../lib/clr.js'

function throwError(errorMessage) {
  console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} ${errorMessage}\n`)
  throw new Error(errorMessage)
}

// Note: Ensure that systemctl exists and app is root before calling this function.
function disable () {
  Place.logAppNameAndVersion()

  const { isActive, isEnabled } = status()

  if (!isEnabled) {
    throwError('Place daemon is not enabled. Nothing to disable.')
  }

  try {
    // Disable and stop the web server.
    childProcess.execSync('sudo systemctl disable place', {env: process.env, stdio: 'pipe'})
    childProcess.execSync('sudo systemctl stop place', {env: process.env, stdio: 'pipe'})
    try {
      // And remove the systemd service file we created.
      fs.unlinkSync('/etc/systemd/system/place.service')
    } catch (error) {
      throwError(`Place daemon is disabled but could not delete the systemd service file (${error}).`)
    }
  } catch (error) {
    throwError(`Could not disable Place daemon (${error}).`)
  }

  console.log('\n   🎈    ❨Place❩ Place daemon stopped and removed from startup.\n')
}

export default disable
