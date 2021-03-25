//////////////////////////////////////////////////////////////////////
//
// Ensure: provides functions that ensure that certain
// ======= expected conditions exist in the runtime environment.
//
//////////////////////////////////////////////////////////////////////

import childProcess from 'child_process'
import os from 'os'
import path from 'path'
import Place from '../../index.js'
import * as runtime from './runtime.js'
import getStatus from './status.js'
import clr from '../../lib/clr.js'

import { fileURLToPath } from 'url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

class Ensure {

  // Does the passed command exist? Returns: bool.
  commandExists (command) {
    try {
      const commandToUse = (process.platform === 'win32') ? 'where.exe /Q' : 'which'
      childProcess.execFileSync(commandToUse, [command], {env: process.env})
      return true
    } catch (error) {
      return false
    }
  }

  // Ensure we have root privileges and exit if we don’t.
  root () {
    os.platform() === 'win32' ? this.rootOnWindows() : this.rootOnLinuxesque()
  }

  rootOnWindows () {
    const isAdministrator = (childProcess.execSync('powershell.exe -Command ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)')).toString().trim() === 'True'

    if (!isAdministrator) {
      let commonArguments = process.argv.slice(2).map(_ => `"${_}"`).join(', ')
      let binaryName
      let theArguments
      try {
        if (runtime.isNode) {
          binaryName = 'node.exe'
          theArguments = `"${path.join(__dirname, '..', 'place')}", ${commonArguments}`
        } else {
          binaryName = 'place.exe'
          theArguments = commonArguments
        }
        const command = `powershell.exe -Command Start-Process "${binaryName}" -ArgumentList ${theArguments} -Verb RunAs`
        const options = {env: process.env, stdio: 'inherit'}
        childProcess.execSync(command, options)
      } catch (error) {
        process.exit(1)
      }
      process.exit(0)
    }
  }


  rootOnLinuxesque () {
    if (process.getuid() !== 0) {
      // Requires root but wasn’t run with sudo. Automatically restart using sudo.
      console.log('   🧙    ❨Place❩ Root privileges required.')
      console.log('   ✨    ❨Place❩ Starting privileged process…')
      const options = {env: process.env, stdio: 'inherit'}
      try {
        if (runtime.isNode) {
          childProcess.execSync(`sudo node ${path.join(__dirname, '..', 'place')} ${process.argv.slice(2).concat(['--dont-log-app-name-and-version']).join(' ')}`, options)
        } else {
          childProcess.execSync(`sudo place ${process.argv.slice(2).concat(['--dont-log-app-name-and-version']).join(' ')}`, options)
        }
      } catch (error) {
        // console.log(error)
        process.exit(1)
      }
      process.exit(0)
    }
  }


  // Ensure systemctl exists.
  systemctl () {
    if (!this.commandExists('systemctl')) {
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Daemons are only supported on Linux systems with systemd (systemctl required).\n`)
      process.exit(1)
    }
  }


  // Ensure journalctl exists.
  journalctl () {
    if (!this.commandExists('journalctl')) {
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Daemons are only supported on Linux systems with systemd (journalctl required).\n`)
      process.exit(1)
    }
  }

  // Ensures that the server daemon is not currently active.
  serverDaemonNotActive () {
    // Ensure systemctl exists as it is required for getStatus().
    // We cannot check in the function itself as it would create
    // a circular dependency.
    this.systemctl()
    const { isActive } = getStatus()

    if (isActive) {
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Place daemon is already running.\n\n         ${clr('Please stop it before retrying using:', 'yellow')} place ${clr('disable', 'green')}\n`)
      process.exit(1)
    }
  }

  // Linux has an archaic security restriction dating from the mainframe/dumb-terminal era where
  // ports < 1024 are “privileged” and can only be connected to by the root process. This has no
  // practical security advantage today (and actually can lead to security issues). Instead of
  // bending over backwards and adding more complexity to accommodate this, we use a feature that’s
  // been in the Linux kernel since version 4.11 to disable privileged ports.
  //
  // As this change is not persisted between reboots and takes a trivial amount of time to
  // execute, we carry it out every time.
  //
  // For more details, see: https://source.small-tech.org/place/app/-/issues/169
  privilegedPortsAreDisabled () {
    if (os.platform() === 'linux') {
      try {
        Place.logAppNameAndVersion()

        console.log('   😇    ❨Place❩ Linux: about to disable privileged ports so we can bind to ports < 1024.')
        console.log(`         ${clr('(For details, see: https://source.small-tech.org/place/app/-/issues/169', 'italic')})`)

        childProcess.execSync('sudo sysctl -w net.ipv4.ip_unprivileged_port_start=0', {env: process.env})
      } catch (error) {
        console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not disable privileged ports. Cannot bind to port 80 and 443. Exiting.`, error)
        process.exit(1)
      }
    }
  }
}

export default new Ensure()
