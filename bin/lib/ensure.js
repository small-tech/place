//////////////////////////////////////////////////////////////////////
//
// Ensure: provides functions that ensure that certain
// ======= expected conditions exist in the runtime environment.
//
//////////////////////////////////////////////////////////////////////

import childProcess from 'child_process'
import os from 'os'
import fs from 'fs-extra'
import path from 'path'
import Util from '../../lib/Util.js'
import Place from '../../index.js'
import * as runtime from './runtime.js'
import getStatus from './status.js'
import clr from '../../lib/clr.js'

const __dirname = new URL('.', import.meta.url).pathname

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

  // If the sync option is specified, ensure that Rsync exists on the system.
  // (This will install it automatically if a supported package manager exists.)
  rsyncExists() {
    const rsyncOnWindowsPath = path.join(Util.unprivilegedHomeDirectory(), '.small-tech.org', 'place', 'portable-rsync-with-ssh-for-windows')

    if (os.platform() === 'win32') {
      if (fs.existsSync(rsyncOnWindowsPath)) return // Already installed.
    } else {
      if (this.commandExists('rsync')) return // Already installed.
    }

    if (os.platform() === 'darwin') {
      console.log('\n   ⚠️    ❨Place❩ macOS: rsync should be installed default but isn’t. Please fix this before trying again.\n')
      process.exit(1)
    }

    if (os.platform() === 'win32') {
      //
      // Since Windows does not have rsync, we use the @small-tech/portable-rsync-with-ssh-for-windows package to include a portable
      // build of rsync and ssh that uses cygwin emulation.
      //
      // We copy all the files to an external directory so that we can call execSync() on it as we’re wrapped in an executable using Nexe
      // (https://github.com/nexe/nexe).
      //
      // We are use readFileSync() and writeFileSync() as, earlier, Nexe did not support copyFileSync(). However, it looks like they
      // do now so we can test and refactor this later if necessary (see https://github.com/nexe/nexe/issues/607).
      //
      console.log('   🌠    ❨Place❩ Unbundling cygwin emulated rsync and ssh for Windows…')

      const appRootDirectory = path.join(__dirname, '..', '..')
      const internalRsyncBundleDirectory = path.join(appRootDirectory, 'node_modules', '@small-tech', 'portable-rsync-with-ssh-for-windows')
      const internalBinDirectory = path.join(internalRsyncBundleDirectory, 'bin')
      const internalEtcDirectory = path.join(internalRsyncBundleDirectory, 'etc')

      const binFiles = fs.readdirSync(internalBinDirectory)
      const etcFiles = fs.readdirSync(internalEtcDirectory)

      const externalRsyncBundleDirectory = rsyncOnWindowsPath
      const externalBinDirectory = path.join(externalRsyncBundleDirectory, 'bin')
      const externalEtcDirectory = path.join(externalRsyncBundleDirectory, 'etc')

      fs.ensureDirSync(externalBinDirectory)
      fs.ensureDirSync(externalEtcDirectory)

      binFiles.forEach(fileToCopy => {
        try {
          const fileBuffer = fs.readFileSync(path.join(internalBinDirectory, fileToCopy), 'binary')
          fs.writeFileSync(path.join(externalBinDirectory, fileToCopy), fileBuffer, {encoding: 'binary', mode: 0o755})
        } catch (error) {
          throw new Error(`   ❌    ❨Place❩ Panic: Could not copy bin file to external directory: ${error.message}`)
        }
      })

      etcFiles.forEach(fileToCopy => {
        try {
          const fileBuffer = fs.readFileSync(path.join(internalEtcDirectory, fileToCopy), 'binary')
          fs.writeFileSync(path.join(externalEtcDirectory, fileToCopy), fileBuffer, {encoding: 'binary', mode: 0o755})
        } catch (error) {
          throw new Error(`   ❌    ❨Place❩ Panic: Could not copy etc file to external directory: ${error.message}`)
        }
      })

      console.log('   🎉    ❨Place❩ Rsync and ssh unbundled into Windows.\n')
      return
    }

    //
    // Attempt to install rsync on Linux-like environments.
    //

    console.log('   🌠    ❨Place❩ Installing Rsync dependency…')

    let options = {env: process.env}
    try {
      if (this.commandExists('apt')) {
        options.env.DEBIAN_FRONTEND = 'noninteractive'
        childProcess.execSync('sudo apt-get install -y -q rsync', options)
        console.log('   🎉    ❨Place❩ Rsync installed using apt.\n')
      } else if (this.commandExists('yum')) {
        // Untested: if you test this, please let me know https://github.com/indie-mirror/https-server/issues
        console.log('\n   🤪     ❨Place❩ Attempting to install required dependency using yum. This is currently untested. If it works (or blows up) for you, I’d appreciate it if you could open an issue at https://github.com/indie-mirror/https-server/issues and let me know. Thanks! – Aral\n')
        childProcess.execSync('sudo yum install rsync', options)
        console.log('   🎉    ❨Place❩ Rsync installed using yum.')
      } else if (this.commandExists('pacman')) {
        childProcess.execSync('sudo pacman -S rsync', options)
        console.log('   🎉    ❨Place❩ Rsync installed using pacman.')
      } else {
        // No supported package managers installed. Warn the person.
        console.log('\n   ⚠️     ❨Place❩ Linux: No supported package manager found for installing Rsync on Linux (tried apt, yum, and pacman). Please install Rsync manually and run Place again.\n')
        process.exit(1)
      }
    } catch (error) {
      // There was an error and we couldn’t install the dependency. Warn the person.
      console.log('\n   ⚠️     ❨Place❩ Linux: Failed to install Rsync. Please install it manually and run Place again.\n', error)
      process.exit(1)
    }
  }

}

export default new Ensure()
