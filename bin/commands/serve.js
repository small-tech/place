//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: serve
//
// Starts web server as a regular system process with either:
//
// • locally-trusted TLS certificates (@localhost), or
// • globally-trusted certificates (@hostname)
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import fs from 'fs'
import pathModule from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import create from '../lib/create.js'
import help from './help.js'

// Note: requires are at the bottom to avoid a circular reference as ../../index (Place)
// ===== also requires this module.
// import generateContent from '../lib/generate-content'

const DOMAIN = 'domain'
const ALIASES = 'aliases'

// This will only show errors in the access log (HTTP response codes 4xx and 5xx).
const ACCESS_LOG_ERRORS_ONLY = 'access-log-errors-only'

// This will disable the access log completely. Not even errors will be shown.
const ACCESS_LOG_DISABLE = 'access-log-disable'

// This will skip the domain reachability check when starting a global server. Useful if you are setting up a server
// where you know that the DNS has not propagated yet. Note that if you specify this flag, you double check that you’ve
// specified the domain and any aliases correctly as you will not be warned if you make a mistake.
const SKIP_DOMAIN_REACHABILITY_CHECK = 'skip-domain-reachability-check'

// Internal: used for pre-flight check to ensure the server can launch before creating a daemon.
const EXIT_AFTER_LAUNCH = 'exit-after-launch'

let global = null
let port = null
let path = null

async function serve (args) {

  // We repeat the assignment to null here to ensure these variables are null
  // in case the server was restarted and the module itself was cached.
  global = null
  port = null
  path = null

  if (args.positional.length > 2) {
    syntaxError('Serve command has maximum of two arguments (what to serve and where to serve it).')
  }

  // Parse positional arguments.
  args.positional.forEach(arg => {
    if (arg.startsWith('@')) {
      // Parse host.
      let _host = arg
      const multipleHostDefinitionsErrorMessage = 'Multiple host definitions encountered. Please only use one.'

      // Parse port and update host accordingly if a port is provided.
      // e.g., @localhost:999
      if (arg.includes(':')) {
        const hostAndPort = arg.split(':')
        const hasCorrectNumberOfColons = hostAndPort.length === 2
        if (!hasCorrectNumberOfColons) {
          syntaxError('Host definition syntax can only contain one colon: @localhost:port. Default: @localhost:443')
        }

        _host = hostAndPort[0]
        const _port = hostAndPort[1]

        if (port === null) {
          port = ensurePort(_port)
        } else {
          syntaxError(multipleHostDefinitionsErrorMessage)
        }
      }

      // Update global flag based on host type.
      if (global === null) {
        global = isHostGlobal(_host)
      } else {
        syntaxError(multipleHostDefinitionsErrorMessage)
      }
    } else {
      // Since the positional argument doesn’t start with an @,
      // it must be the name of the directory to serve.
      if (path === null) {
        path = arg
      } else {
        syntaxError('Two folders found to serve. Please only supply one.')
      }
    }
  })

  // Add defaults for any arguments not provided.
  global = global === null ? false : global
  port = port === null ? 443 : port
  path = path === null ? null : path

  //
  // Check if place has been initialised yet.
  // If not, run the creation process.
  //
  // const folder = path === null ? '.' : path
  // const placePath = pathModule.resolve(folder)
  // const lastPathSeparator = placePath.lastIndexOf(pathModule.sep)
  // const placeDomain = placePath.slice(lastPathSeparator + 1)
  // const placeDataPath = pathModule.join(Place.settingsDirectory, placeDomain)

  // if (!fs.existsSync(placePath) || !fs.existsSync(placeDataPath)) {
  //   Place.logAppNameAndVersion()
  //   console.log(` ℹ️  Place ${placeDomain} is not initialised.`)

  //   const confirmCreate = await inquirer.prompt([
  //     {
  //       type: 'confirm',
  //       name: 'create',
  //       prefix: ' 🙋',
  //       message: `Create a new place at ${chalk.green(placePath)}?`,
  //       default: true
  //     }
  //   ])

  //   if (!confirmCreate.create) {
  //     console.log('\n ❌️ Aborting!')
  //     console.log(chalk.hsl(329,100,50)('\n    Goodbye.'))
  //     process.exit(1)
  //   }

  //   // Create the place before continuing to serve it.
  //   await create({
  //     positional: [placePath],
  //     named: args.named
  //   })
  // }

  //
  // Parse named arguments.
  //

  // Domain.
  const domain = args.named[DOMAIN]

  // Aliases.
  const _aliases = args.named[ALIASES]
  const aliases = _aliases === undefined ? [] : _aliases.split(',')

  // This will skip the domain reachability check when starting a global server. Useful if you are setting up a server
  // where you know that the DNS has not propagated yet. Note that if you specify this flag, you double check that
  // you’ve specified the domain and any aliases correctly as you will not be warned if you make a mistake.
  const skipDomainReachabilityCheck = args.named[SKIP_DOMAIN_REACHABILITY_CHECK]

  // Internal: exit on launch. (Used in pre-flight checks to ensure server can launch before installing a daemon.)
  const exitAfterLaunch = args.named[EXIT_AFTER_LAUNCH]

  // Only show errors in the access log. Successful attempts are not shown.
  // (This makes it easier not to miss errors during development.)
  const accessLogErrorsOnly = args.named[ACCESS_LOG_ERRORS_ONLY]

  // Disable the access log (not even access errors will be shown).
  // Note: if you want to quiet all messages, you must set the QUIET environment variable when running Place.
  const accessLogDisable = args.named[ACCESS_LOG_DISABLE]

  //
  // Start the server.
  //

  // Ensure privileged ports are disabled on Linux machines.
  // For details, see: https://source.small-tech.org/site.js/app/-/issues/169
  ensure.privilegedPortsAreDisabled()

  // Start a server and also sync if requested.
  tcpPortUsed.check(port)
  .then(async inUse => {
    if (inUse) {
      // Check to see if the problem is that Place is running as a daemon and
      // display a more specific error message if so. (Remember that daemons are
      // only supported on port 443 at the moment.)
      if (port === 443) {
        if (ensure.commandExists('systemctl')) {
          if ({ isActive } = status()) {
            console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Cannot start server. Place is already running as a daemon on port ${clr(port.toString(), 'cyan')}. Use the ${clr('stop', 'green')} command to stop it.\n`)
            process.exit(1)
          }
        }
      }

      // Generic port-in-use error message.
      console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Cannot start server. Port ${clr(port.toString(), 'cyan')} is already in use.\n`)
      process.exit(1)
    } else {

      let options = {
        domain,
        path,
        port,
        global,
        aliases,
        skipDomainReachabilityCheck,
        accessLogErrorsOnly,
        accessLogDisable
      }

      // Start serving the site.
      let site
      try {
        site = new Place(options)
      } catch (error) {
        // Rethrow
        throw(error)
      }

      // Start serving.
      try {
        await site.serve()

        if (exitAfterLaunch) {
          console.log('   ✅    Exit after launch requested. Launch successful; exiting…')
          process.exit(0)
        }

      } catch (error) {
        console.log(error)
        if (error instanceof errors.InvalidPathToServeError) {
          console.log(`\n   ❌    ${clr(`❨Place❩ Error:`, 'red')} ${error.message}\n`)
          process.exit(1)
        } else {
          // Rethrow
          throw(error)
        }
      }

      const server = site.server
    }
  })
}

// Display a syntax error.
function syntaxError(message = null) {
  const additionalMessage = message === null ? '' : message
  console.log(`\n   ❌    ${clr('❨Place❩ Syntax error:', 'red')} ${additionalMessage}`)
  help()
}

// Throw a general error.
function throwError(errorMessage) {
  console.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} ${errorMessage}\n`)
  throw new Error(`Error: ${errorMessage}`)
}

function isHostGlobal(host) {
  const isValidHost = ['@localhost', '@hostname'].includes(host)
  if (!isValidHost) {
    syntaxError(`Invalid host: ${host}. Host should either be @localhost or @hostname. Default: @localhost`)
  }
  return (host === '@hostname')
}

// Ensures that port is valid before returning it.
function ensurePort (port) {
  // If a port is specified, use it. Otherwise use the default port (443).
  port = parseInt(port)

  const inTheValidPortRange = 'between 0 and 49,151 inclusive'

  // Invalid port.
  if (isNaN(port)) {
    throwError(`“${port}” is not a valid port. Try a number ${inTheValidPortRange}.`)
  }

  // Check for a valid port range
  // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
  if (port < 0 || port > 49151) {
    throwError(`specified port must be ${inTheValidPortRange}.`)
  }

  return port
}


export default serve

// Note: requires are at the bottom to avoid a circular reference as ../../index (Place)
// ===== also requires this module.

import ensure from '../lib/ensure.js'
import status from '../lib/status.js'
import tcpPortUsed from 'tcp-port-used'
import clr from '../../lib/clr.js'
import errors from '../../lib/errors.js'
import Place from '../../index.js'
