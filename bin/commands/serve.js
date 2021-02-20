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
import path from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import create from '../lib/create.js'
import os from 'os'

import ensure from '../lib/ensure.js'
import status from '../lib/status.js'
import tcpPortUsed from 'tcp-port-used'
import clr from '../../lib/clr.js'
import errors from '../../lib/errors.js'
import Place from '../../index.js'

import crossPlatformHostname from '@small-tech/cross-platform-hostname'

import help from './help.js'

// Note: requires are at the bottom to avoid a circular reference as ../../index (Place)
// ===== also requires this module.
// import generateContent from '../lib/generate-content'

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

// A place is always served from port 443.
const port = 443

let domain = null
let client = null
let placePath = null
let clientPath = null
let global = false

async function serve (args) {
  // We repeat the assignments to null here to ensure these variables are null
  // in case the server was restarted and the module itself was cached.
  domain = null
  client = null
  placePath = null
  clientPath = null
  global = false

  switch (args.positional.length) {
    case 0:
      // No domain specified, default to hostname.
      domain = crossPlatformHostname
      break;
    case 1:
      domain = args.positional[0]
      break;
    default:
      syntaxError('Serve command takes at most one argument (the domain to serve).')
  }

  client = args.named['client']

  placePath = path.join(os.homedir(), domain)
  clientPath = path.join(placePath, 'client')

  if (args.named['--at-localhost'] && args.named['--at-hostname']) {
    syntaxError('Please specify either --at-localhost or at-hostname, not both.')
  }

  global = (args.named['at-hostname'] !== undefined)

  // console.log('Serve')
  // console.log('=====')
  // console.log('Domain: ', domain)
  // console.log('Place path: ', placePath)
  // console.log('Client: ', client)
  // console.log('Client path: ', clientPath)
  // console.log('Global: ', global)

  //
  // Check if place has been initialised yet.
  // If not, run the creation process.
  //

  if (!fs.existsSync(placePath)) {

    // TODO: Check if --public-signing-key and --public-encryption-key are provided.
    // If so, do not run the interactive routine as we have all the information we need to
    // create the place.

    Place.logAppNameAndVersion()
    console.log(` ℹ️  A place does not yet exist for ${chalk.yellow(domain)}`)

    const confirmCreate = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'create',
        prefix: ' 🙋',
        message: `Create a new place at ${chalk.green(path.join(os.homedir(), placePath))}?`,
        default: true
      }
    ])

    if (!confirmCreate.create) {
      console.log('\n ❌️ Aborting!')
      console.log(chalk.hsl(329,100,50)('\n    Goodbye.'))
      process.exit(1)
    }

    // Create the place before continuing to serve it.
    const placeDetails = await create(domain, client, placePath, clientPath)
    client = placeDetails.client
  }

  //
  // Parse named arguments.
  //

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
          const { isActive } = status()
          if (isActive) {
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
        placePath,
        client,
        clientPath,
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
