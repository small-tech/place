//////////////////////////////////////////////////////////////////////
//
// Function: status (synchronous)
//
// Returns the Place daemon status.
//
// Proxies: systemctl status place
//
//////////////////////////////////////////////////////////////////////

import fs from 'fs'
import path from 'path'
import childProcess from 'child_process'
import crossPlatformHostname from '@small-tech/cross-platform-hostname'

import Place from '../../index.js'

function status () {

  const isWindows = process.platform === 'win32'
  if (isWindows) {
    // Daemons are not supported on Windows so we know for sure that it is
    // neither active nor enabled :)
    return { isActive: false, isEnabled: false }
  }

  // Note: do not call ensure.systemctl() here as it will
  // ===== create a cyclic dependency. Instead, check for
  //       systemctl support manually before calling status().

  let isActive
  try {
    childProcess.execSync('systemctl is-active place', {env: process.env, stdio: 'pipe'})
    isActive = true
  } catch (error) {
    isActive = false
  }

  let isEnabled
  try {
    childProcess.execSync('systemctl is-enabled place', {env: process.env, stdio: 'pipe'})
    isEnabled = true
  } catch (error) {
    isEnabled = false
  }

  let daemonDetails = null
  if (isEnabled) {
    // Parse the systemd unit configuration file to retrieve daemon details.
    const configuration = fs.readFileSync(path.join(path.sep, 'etc', 'systemd', 'system', 'place.service'), 'utf-8').trim().split('\n')

    const account = configuration[8].trim().replace('User=', '')
    const execStart = configuration[14].trim().replace('=node ', '=')

    // Launch configuration.
    const binaryAndPathBeingServed = /ExecStart=(.*?) (.*?) @hostname/.exec(execStart)
    const placeBinary = binaryAndPathBeingServed[1]
    const pathBeingServed = binaryAndPathBeingServed[2]

    // Optional options.
    let _domain, _aliases
    const domain = (_domain = /--domain=(.*?)(\s|--|$)/.exec(execStart)) === null ? null : _domain[1]
    const aliases = (_aliases = /--aliases=(.*?)(\s|--|$)/.exec(execStart)) === null ? null : _aliases[1].split(',')
    const skipDomainReachabilityCheck = execStart.includes('--skip-domain-reachability-check')
    const accessLogErrorsOnly = execStart.includes('--access-log-errors-only')
    const accessLogDisable = execStart.includes('--access-log-disable')

    let statisticsUrl = null
    if (isActive) {
      const statisticsPath = fs.readFileSync(path.join(Place.settingsDirectory, 'statistics-route'), 'utf-8')
      statisticsUrl = `https://${domain || crossPlatformHostname}${statisticsPath}`
    }

    const optionalOptions = {
      domain,
      aliases,
      skipDomainReachabilityCheck,
      accessLogErrorsOnly,
      accessLogDisable
    }

    daemonDetails = {
      account,
      placeBinary,
      statisticsUrl,
      pathBeingServed,
      optionalOptions
    }
  }

  return { isActive, isEnabled, daemonDetails }
}

export default status
