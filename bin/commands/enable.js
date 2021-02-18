//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: enable
//
// Enables the web server daemon (launches it as a startup daemon).
//
// Note: enable is only supported on Linux distributions that have
// ===== systemd. macOS and Windows are not supported for
//       production use. Ideally, deploy on Ubuntu 18.04 LTS or
//       Ubuntu 20.04 LTS.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import os from 'os'
import fs from 'fs'
import path from 'path'
import childProcess from 'child_process'

import tcpPortUsed from 'tcp-port-used'

import runtime from '../lib/runtime.js'
import ensure from '../lib/ensure.js'
import clr from '../../lib/clr.js'

import Util from '../../lib/Util.js'

import Place from '../../index.js'

const __dirname = new URL('.', import.meta.url).pathname

function enable (args) {
  Place.logAppNameAndVersion()

  // Security
  Util.refuseToRunAsRoot()

  //
  // Sanity checks.
  //
  ensure.systemctl()
  ensure.serverDaemonNotActive()

  // Note: daemons are currently only supported on port 443. If there is a need
  // ===== to support other ports, please open an issue and explain the use case
  //       (it is easy enough to implement.)

  // Ensure privileged ports are disabled on Linux machines.
  // For details, see readme.
  ensure.privilegedPortsAreDisabled()

  // While we’ve already checked that the Place daemon is not
  // active, above, it is still possible that there is another service
  // running on port 443. We could ignore this and enable the systemd
  // service anyway and this command would succeed and our server would
  // start being served when the blocking service is stopped. However, this
  // is misleading as the command succeeding makes it appear as if the
  // server has started running. So, instead, we detect if the port
  // is already in use and, if it is, refuse to install and activate the
  // service. This is should provide the least amount of surprise in usage.
  tcpPortUsed.check(443)
  .then(inUse => {
    if (inUse) {
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Cannot start daemon. Port 443 is already in use.\n`)
      process.exit(1)
    } else {
      // Ensure we are root (we do this here instead of before the asynchronous call to
      // avoid any timing-related issues around a restart and a port-in-use error).
      ensure.root()

      if (args.positional.length > 1) {
        // Syntax error.
        console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Too many arguments (expects just one, the path to serve).`)
        process.exit(1)
      }

      //
      // Create the systemd service unit.
      //
      const _pathToServe = args.positional.length === 1 ? args.positional[0] : '.'
      const binaryExecutable = '/usr/local/bin/place'
      const sourceDirectory = path.resolve(__dirname, '..', '..')
      const executable = runtime.isBinary ? binaryExecutable : `${childProcess.execSync('which node').toString().trim()} ${path.join(sourceDirectory, 'bin/place')}`

      // It is a common mistake to start the server in a .dynamic folder (or subfolder)
      // or a .hugo folder or subfolder. In these cases, try to recover and do the right thing.
      const {pathToServe, absolutePathToServe} = Util.magicallyRewritePathToServeIfNecessary(args.positional[0], _pathToServe)

      // If there are aliases, we will add them to the configuration so they can
      // be passed to the serve command when Place is started.
      const _aliases = args.named['aliases']
      const aliases = _aliases === undefined ? '' : `--aliases=${_aliases}`

      // If the domain has been manually specified, pass that on.
      const _domain = args.named['domain']
      const domain = args.named['domain'] === undefined ? '' : `--domain=${_domain}`

      // This will skip the domain reachability check when starting a global server.
      const skipDomainReachabilityCheck = args.named['skip-domain-reachability-check'] === true ? ' --skip-domain-reachability-check ' : ''

      // This will only show errors in the access log.
      const accessLogErrorsOnly = args.named['access-log-errors-only'] === true ? ' --access-log-errors-only ' : ''

      // This will disable the access log completely. Do not do this unless you have a good
      // reason to as you may miss important errors.
      const accessLogDisable = args.named['access-log-disable'] === true ? ' --access-log-disable ' : ''

      // Expectation: At this point, regardless of whether we are running as a regular
      // Node script or as a standalone executable created with Nexe, all paths should
      // be set correctly.

      const launchCommand = `${executable} ${absolutePathToServe} @hostname ${domain} ${aliases} ${skipDomainReachabilityCheck} ${accessLogErrorsOnly} ${accessLogDisable}`

      const accountName = Util.unprivilegedAccountName()

      const unit = `[Unit]
      Description=Place
      Documentation=https://place.small-web.org/
      After=network.target
      StartLimitIntervalSec=0

      [Service]
      Type=simple
      User=${accountName}
      Environment=PATH=/sbin:/usr/bin:/usr/local/bin
      Environment=NODE_ENV=production
      RestartSec=1
      Restart=always

      ExecStart=${launchCommand}

      [Install]
      WantedBy=multi-user.target
      `

      //
      // Ensure passwordless sudo is set up before installing and activating the
      // service (or else automatic updates will fail).
      //

      try {
        // The following command will fail if passwordless sudo is not set up.
        childProcess.execSync(`sudo --user=${accountName} sudo --reset-timestamp --non-interactive cat /etc/sudoers > /dev/null 2>&1`, {env: process.env})
      } catch {
        // Passwordless sudo is not set up.
        console.log(' 🔐 Passwordless sudo is required for automatic server updates. Attempting to set up…')

        // Sanity check: ensure the /etc/sudoers file exists.
        if (!fs.existsSync('/etc/sudoers')) {
          console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not find /etc/sudoers file.\n`)
          process.exit(1)
        }

        // Sanity check: ensure the /etc/sudoers.d directory exists as this is where we
        // need to put our sudo rule to allow passwordless sudo.
        if (!fs.existsSync('/etc/sudoers.d')) {
          console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not find /etc/sudoers.d directory.\n`)
          process.exit(1)
        }

        // Sanity check: ensure sudo is set up to read sudo rules from /etc/sudoers.d directory.
        const sudoers = fs.readFileSync('/etc/sudoers', 'utf-8')
        if (!sudoers.includes('#includedir /etc/sudoers.d')) {
          console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Cannot set up passwordless sudo as /etc/sudoers.d is not included from /etc/sudoers.\n`)
          console.log(`         ${clr('❨Place❩', 'red')} Add this line to the end of that file using visudo to fix:\n`)
          console.log(`         ${clr('❨Place❩', 'red')} #includedir /etc/sudoers.d\n`)
          process.exit(1)
        }

        // Create our passwordless sudo configuration file in the temporary folder.
        fs.writeFileSync('/tmp/place-passwordless-sudo', `${accountName} ALL=(ALL:ALL) NOPASSWD: ALL\n`)

        // Check the syntax to ensure that we don’t mess up the system and lock the account out.
        // (You can never be too careful when updating the sudo rules as one mistake and you could
        // lock a person out of their account.)
        try {
          childProcess.execSync(`visudo -c -f /tmp/place-passwordless-sudo`)
        } catch (error) {
          console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not verify that our attempt to set up passwordless sudo would succeed. Aborting.\n${error}\n`)
          process.exit(1)
        }

        // OK, the file is valid, copy it to the actual directory so it takes effect.
        try {
          childProcess.execSync('sudo cp /tmp/place-passwordless-sudo /etc/sudoers.d/')
        } catch (error) {
          console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not install the passwordless sudo rule. Aborting.\n${error}\n`)
          process.exit(1)
        }

        console.log('   🔐    Passwordless sudo successfully set up.')
      }

      //
      // Save the systemd service unit.
      //
      fs.writeFileSync('/etc/systemd/system/place.service', unit, 'utf-8')

      // Pre-flight check: run the server normally and ensure that it starts up properly
      // before installing it as a daemon. If there are any issues we want to catch it here
      // ourselves instead of having them manifest when systemd runs it.
      console.log('   🧙    ❨Place❩ About to carry out server daemon pre-flight check.')
      console.log('   ✨    ❨Place❩ Launching server…')
      try {
        // Note: we are launching Place without privileges here as we currently have privileges.
        // ===== (If we don’t do that, the configuration directories will be created with root as
        //       the owner and that they cannot be accessed by the regular unprivileged daemon process.)
        childProcess.execSync(`sudo --user=${accountName} ${launchCommand} --dont-log-app-name-and-version --exit-after-launch ${skipDomainReachabilityCheck}`, {env: process.env, stdio: 'pipe'})
        console.log('   ✨    ❨Place❩ Pre-flight check successful.')
      } catch (error) {
        const stdout = error.stdout.toString()
        const errorMessage = stdout.slice(stdout.match(/❌.*?/).index)

        console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Server launch failed: \n  `, errorMessage.replace('❌', '  ').replace('❨Place❩ Error: ', '').replace('\n', ''))
        process.exit(1)
      }


      //
      // Enable and start systemd service.
      //
      try {
        // Start.
        const prettyPathToServe = pathToServe === '.' ? 'current directory' : pathToServe
        childProcess.execSync('sudo systemctl start place', {env: process.env, stdio: 'pipe'})
        console.log(`   😈    ❨Place❩ Launched as daemon on ${clr(`https://${domain === '' ? os.hostname() : _domain}`, 'green')} serving ${clr(prettyPathToServe, 'cyan')}`)

        // Enable.
        childProcess.execSync('sudo systemctl enable place', {env: process.env, stdio: 'pipe'})
        console.log(`   😈    ❨Place❩ Installed daemon for auto-launch at startup.`)
      } catch (error) {
        console.log(error, `\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not enable server.\n`)
        process.exit(1)
      }

      // All OK!
      console.log('\n   👍    ❨Place❩ You’re all set!\n')
    }
  })
}


export default enable
