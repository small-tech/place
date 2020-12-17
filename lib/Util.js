//////////////////////////////////////////////////////////////////////
//
// Util
//
// General utilities.
//
//////////////////////////////////////////////////////////////////////

const os = require('os')
const path = require('path')
const process = require('process')
const childProcess = require('child_process')
const clr = require('../lib/clr')

class Util {

  static unprivilegedAccountName () {
    if (process.platform === 'win32' || process.env.USER !== 'root') {
      // Does not apply to Windows as there is no sudo.
      return os.userInfo().username
    } else {
      return process.env.SUDO_USER
    }
  }


  static unprivilegedHomeDirectory () {
    if (process.platform === 'win32') {
      return os.homedir()
    } else {
      // Linuxesque: return non-root home folder even if invoked via sudo.
      return `/home/${Util.unprivilegedAccountName()}`
    }
  }


  static refuseToRunAsRoot () {
    // Refuse to run if this is the root account.
    if (process.env.USER === 'root' && process.env.SUDO_USER === undefined) {
      // This is an attempt to run Place from the root account.
      // Reject for security reasons.
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Refusing to run from the root account for security reasons.\n`)
      console.log(`         ${clr('Please create and use an account with regular privileges to run Place.', 'yellow')}\n`)
      process.exit(1)
    }
  }


  // It is a common mistake to start the server in a .dynamic folder (or subfolder), etc.
  // In these cases, try to recover and do the right thing.
  static magicallyRewritePathToServeIfNecessary (pathSpecified, pathToServe) {
    if (pathToServe === '/') {
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Refusing to serve the root directory due to security concerns.\n`)
      process.exit(1)
    }

    if (pathToServe === Util.unprivilegedHomeDirectory()) {
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Refusing to serve home directory due to security concerns.\n`)
      process.exit(1)
    }

    // Only attempt to magically fix the path to serve (if necessary)
    // if the current directory way not specifically requested by the person.
    let absolutePathToServe = path.resolve(pathToServe)

    if (pathSpecified !== '.' && pathToServe === '.') {
      const specialFolders = /\.dynamic.*$|\.db.*$|\.wildcard.*$/
      const intelligentAbsolutePathToServe = absolutePathToServe.replace(specialFolders, '')

      if (absolutePathToServe !== intelligentAbsolutePathToServe) {
        pathToServe = path.relative(absolutePathToServe, intelligentAbsolutePathToServe)
        absolutePathToServe = intelligentAbsolutePathToServe
        console.log(`   🧙    ❨Place❩ ${clr('Magically changed path to serve to the site root.', 'yellow')}`)
      }
    }
    return {pathToServe, absolutePathToServe}
  }
}

module.exports = Util
