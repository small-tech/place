//////////////////////////////////////////////////////////////////////
//
// Function: restart
//
// Restarts the Place daemon.
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')
const status = require('../lib/status')
const clr = require('../../lib/clr')

function throwError(errorMessage) {
  console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} ${errorMessage}\n`)
  throw new Error(errorMessage)
}

function restart () {
  // Note: Ensure that systemctl exists and app is root before calling this function.

  const { isEnabled } = status()

  if (!isEnabled) {
    throwError('Place daemon is not enabled. Please run place enable to enable it.')
  }

  // Note: we mirror systemctl’s behaviour: even if the service is stopped, running
  // ===== restart will start it instead of throwing an error. That’s why we don’t check
  //       if the server is running here.

  try {
    // Restart the web server.
    childProcess.execSync('sudo systemctl restart place', {env: process.env, stdio: 'pipe'})
  } catch (error) {
    throwError(`Could not restart Place daemon (${error}).`)
  }

  console.log('\n   🎈    ❨Place❩ Place daemon restarted.\n')
}

module.exports = restart
