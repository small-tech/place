////////////////////////////////////////////////////////////////////////////////
//
// ⛺ Place
//
// Small Web Protocol Server.
//
// Copyright ⓒ 2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////

import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import EventEmitter from 'events'
import childProcess from 'child_process'

import Graceful from 'node-graceful'
import express from 'express'
import helmet from 'helmet'
import enableDestroy from 'server-destroy'
import chokidar from 'chokidar'
import chalk from 'chalk'

import https from '@small-tech/https'
import crossPlatformHostname from '@small-tech/cross-platform-hostname'

import clr from './lib/clr.js'
import cli from './bin/lib/cli.js'
import Stats from './lib/Stats.js'
import errors from './lib/errors.js'
import Util from './lib/Util.js'

import ensureDomainsAreReachable from './lib/ensure-domains-are-reachable.js'
import addHttpsGetRoutes from './lib/add-https-get-routes.js'
import createWebSocketServer from './lib/create-websocket-server.js'
import initialiseDatabase from './lib/initialise-database.js'

// Middleware
import allowAllCors from './middleware/allow-all-cors.js'
import logging from './middleware/logging.js'
import responseObjectHtmlMethodMixin from './middleware/response-object-html-method-mixin.js'
import domainAliasRedirects from './middleware/domain-alias-redirects.js'
import gitServer from './middleware/git-server.js'
import error404 from './middleware/error-404.js'
import error500 from './middleware/error-500.js'

// For compatibility with legacy CommonJS code.
import { createRequire } from 'module'
const __dirname = new URL('.', import.meta.url).pathname
const require = createRequire(import.meta.url)

class Place {

  //
  // Class.
  //

  static #appNameAndVersionAlreadyLogged = false

  static logo (prefix = ' ') {

    const lightGreen = chalk.rgb(203,232,155)
    const midGreen = chalk.rgb(164, 199, 118)
    const darkGreen = chalk.rgb(0, 98, 91)

    return [
      chalk.hsl(329,100,90)(`${prefix}██████  ██       █████   ██████ ███████ \n`),
      chalk.hsl(329,100,80)(`${prefix}██   ██ ██      ██   ██ ██      ██     \n`),
      chalk.hsl(329,100,70)(`${prefix}██████  ██      ███████ ██      █████  \n`),
      chalk.hsl(329,100,60)(`${prefix}██      ██      ██   ██ ██      ██     \n`),
      chalk.hsl(329,100,50)(`${prefix}██      ███████ ██   ██  ██████ ███████\n`),
      '\n',
      chalk.hsl(329,100,90)(`${prefix}The Small Web Reference Protocol Server\n`),
      '\n',
      '   ' + chalk.bgRed(' WARNING: pre-release. Likely broken. Use at your own risk. \n'),
      '\n',
    ]
  }

  // Returns the cross-platform hostname (os.hostname() on Linux and macOS, special handling on Windows to return the
  // full computer name, which can be a domain name and thus the equivalent of hostname on Linux and macOS).
  static get hostname () { return this._hostname ? this._hostname : crossPlatformHostname }
  static set hostname (domain) { this._hostname = domain }

  // This is the directory that settings and other persistent data is stored for Place.
  static get settingsDirectory () { return path.join(Util.unprivilegedHomeDirectory(), '.small-tech.org', 'place') }

  static sourceVersion () {
    const options = {shell: os.platform() === 'win32' ? 'powershell' : '/bin/bash', env: process.env}

    let sourceVersion
    try {
      const [silenceOutput1, silenceOutput2] = os.platform() === 'win32' ? ['', ''] : ['> /dev/null', '2>&1']
      const command = `pushd ${__dirname} ${silenceOutput1}; git log -1 --oneline ${silenceOutput2}`
      sourceVersion = childProcess.execSync(command, options).toString().match(/^[0-9a-fA-F]{7}/)[0]
    } catch (error) {
      // We are not running from source.
      sourceVersion = 'npm'
    }

    return sourceVersion
  }

  static logAppNameAndVersion () {

    if (process.env.QUIET || Place.#appNameAndVersionAlreadyLogged || process.argv.includes('--dont-log-app-name-and-version')) {
      return
    }

    const prefix = '    '

    const sourceVersion = this.sourceVersion()
    const packageVersion = (require(path.join(__dirname, 'package.json'))).version
    const platform = {linux: 'linux', win32: 'windows', 'darwin': 'macOS'}[os.platform()]
    const architecture = os.arch()

    let message = this.logo(prefix).concat([
      `${prefix}Version ${clr(`${packageVersion}-${sourceVersion} (${platform}/${architecture})`, 'green')}\n`,
      `${prefix}Node.js ${clr(`${process.version.replace('v', '')}`, 'green')}\n`,
      `${prefix}Source  ${clr(`https://source.small-tech.org/place/app/-/tree/${sourceVersion}`, 'cyan')}\n\n`,
      `${prefix}Like this? Fund Us! https://small-tech.org/fund-us \n`,
    ])

    message = message.join('')
    console.log(message)
    Place.#appNameAndVersionAlreadyLogged = true
}

  //
  // Instance.
  //

  // TODO: Update this comment for latest Place.
  // Creates a Site instance. Customise it by passing an options object with the
  // following properties (all optional):
  //
  // •    domain: (string)    the main domain to serve (defaults to the hostname)
  // •      path: (string)    the path to serve (defaults to the current working directory).
  // •      port: (integer)   the port to bind to (between 0 - 49,151; the default is 443).
  // •    global: (boolean)   if true, automatically provision an use Let’s Encrypt TLS certificates.
  // •   aliases: (string)    comma-separated list of domains that we should get TLS certs
  //                          for and serve.
  //
  // Note: if you want to run the site on a port < 1024 on Linux, ensure that privileged ports are disabled.
  // ===== e.g., use require('lib/ensure').disablePrivilegedPorts()
  //
  //       For details, see the readme.

  constructor (options) {
    // Introduce ourselves.
    Place.logAppNameAndVersion()

    Util.refuseToRunAsRoot()

    this.eventEmitter = new EventEmitter()

    // Ensure that the settings directory exists and create it if it doesn’t.
    fs.ensureDirSync(Place.settingsDirectory)

    // The options parameter object and all supported properties on the options parameter
    // object are optional. Check and populate the defaults.
    if (options === undefined) options = {}
    if (typeof options.domain === 'string') {
      Place.hostname = options.domain
    }

    // TODO: These are the same now. Refactor.
    this.pathToServe = options.clientPath
    this.absolutePathToServe = this.pathToServe

    this.placePath = options.placePath

    // TODO: These will always be decided now. Refactor.
    this.port = typeof options.port === 'number' ? options.port : 443
    this.global = typeof options.global === 'boolean' ? options.global : false

    this.aliases = Array.isArray(options.aliases) ? options.aliases : []

    this.skipDomainReachabilityCheck = options.skipDomainReachabilityCheck
    this.accessLogErrorsOnly = options.accessLogErrorsOnly
    this.accessLogDisable = options.accessLogDisable

    // TODO: Refactor.
    Place.pathToServe = this.pathToServe

    // Ensure we can serve the requested path and exit early if not.
    let statusOfPathToServe
    try {
      statusOfPathToServe = fs.statSync(this.absolutePathToServe)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new errors.InvalidPathToServeError(`Path ${clr(this.pathToServe, 'yellow')} does not exist.`)
      } else {
        throw new errors.InvalidPathToServeError('Unexpected file system error', error)
      }
    }

    if (statusOfPathToServe.isFile()) {
      throw new errors.InvalidPathToServeError(`${clr(this.pathToServe, 'yellow')} is a file. Place can only serve directories.`)
    }

    if (this.skipDomainReachabilityCheck) {
      this.log(`   ⚠     ${clr('❨Place❩ Domain reachability pre-flight check is disabled.', 'yellow')}`)
    }

    if (this.accessLogErrorsOnly && !this.accessLogDisable) {
      this.log(`   ⚠     ${clr('❨Place❩ Access log is only showing errors.', 'yellow')}`)
    }

    if (this.accessLogDisable) {
      this.log(`   ⚠     ${clr('❨Place❩ Access log is disabled (not even errors will be shown).', 'yellow')}`)
    }

    // Substitute shorthand www alias for full domain.
    this.aliases = this.aliases.map(alias => alias === 'www' ? `www.${Place.hostname}` : alias)

    // Also save a copy of the options.
    this.options = options

    // Read in public keys.
    const placeKeysPath = path.join(this.placePath, 'public-keys.json')
    Place.publicKeys = JSON.parse(fs.readFileSync(placeKeysPath, 'utf-8'))

    //
    // Create the Express app. We will configure it later.
    //
    this.stats = this.initialiseStatistics()
    this.app = express()

    // Create the HTTPS server.
    this.createServer()
  }


  // Conditionally log to console.
  log(...args) {
    if (process.env.QUIET) {
      return
    }
    console.log(...args)
  }


  // The app configuration is handled in an asynchronous method
  // as there is a chance that we will have to wait for generated content.
  async configureApp () {

    // Express.js security with HTTP headers.
    this.app.use(helmet())

    // Allow cross-origin requests. Wouldn’t be much of a peer-to-peer web without them ;)
    this.app.use(allowAllCors)

    // Statistics middleware (captures anonymous, ephemeral statistics).
    this.app.use(this.stats.middleware)

    // Logging.
    this.app.use(logging(this.accessLogDisable, this.accessLogErrorsOnly))

    // Redirects aliases to main domain.
    if (this.global) {
      this.app.use(domainAliasRedirects(Place.hostname))
    }

    // Mix in html() helper method to response objects.
    this.app.use(responseObjectHtmlMethodMixin)

    // Statistics view (displays anonymous, ephemeral statistics)
    this.app.get(this.stats.route, this.stats.view)

    // Add HTTPS GET routes.
    const httpsGetRoutesDirectory = path.join(__dirname, 'routes', 'https')
    await addHttpsGetRoutes(httpsGetRoutesDirectory, this.app)

    // Middleware: static routes.
    this.app.use(express.static(this.pathToServe))

    // Middleware: git server.
    this.app.use(gitServer(this.placePath))
    this.log(`   🗄️     ❨Place❩ Serving source code repositories at /source/…`)

    // Create WebSocket server, add WebSocket routes, and integrate with Express app.
    const wssRoutesDirectory = path.join(__dirname, 'routes', 'wss')
    await createWebSocketServer(this.app, this.server, wssRoutesDirectory)

    // Note: ensure error roots remain added last.

    // 404 (Not Found) support.
    this.app.use(error404(this.pathToServe))

    // 500 (Server error) support.
    this.app.use(error500(this.pathToServe))
  }

  // Create the server. Use this first to create the server and add the routes later
  // so that we can support asynchronous tasks during app configuration.
  createServer () {
    // Check for a valid port range
    // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
    if (this.port < 0 || this.port > 49151) {
      throw new Error('Error: specified port must be between 0 and 49,151 inclusive.')
    }

    // Create the server.
    this.server = this._createServer({global: this.global}, this.app)

    // Enable the ability to destroy the server (close all active connections).
    enableDestroy(this.server)

    this.server.on('close', async () => {
      // // Clear the auto update check interval.
      // if (this.autoUpdateCheckInterval !== undefined) {
      //   clearInterval(this.autoUpdateCheckInterval)
      //   this.log('   ⏰    ❨Place❩ Cleared auto-update check interval.')
      // }

      if (this.app.__fileWatcher !== undefined) {
        try {
          await this.app.__fileWatcher.close()
          this.log (`   🚮    ❨Place❩ Removed file watcher.`)
        } catch (error) {
          this.log(`   ❌    ❨Place❩ Could not remove file watcher: ${error}`)
        }
      }

      if (globalThis._db) {
        this.log('   🚮    ❨Place❩ Closing database.')
        await globalThis._db.close()
      }
      delete globalThis.db

      this.log('   🚮    ❨Place❩ Housekeeping is done!')
      this.eventEmitter.emit('housekeepingIsDone')
    })
  }


  initialiseStatistics () {
    const statisticsRouteSettingFile = path.join(Place.settingsDirectory, 'statistics-route')
    return new Stats(statisticsRouteSettingFile)
  }


  // Returns an https server instance configured with your locally-trusted TLS
  // certificates by default. If you pass in {global: true} in the options object,
  // globally-trusted TLS certificates are obtained from Let’s Encrypt.
  //
  // Note: if you pass in a key and cert in the options object, they will not be
  // ===== used and will be overwritten.
  _createServer (options = {}, requestListener = undefined) {
    const requestsGlobalCertificateScope = options.global === true

    if (requestsGlobalCertificateScope) {
      this.log('   🌍    ❨Place❩ Using globally-trusted certificates.')

      // Let’s be nice and not continue to pollute the options object
      // with our custom property (global).
      delete options.global

      // Certificates are automatically obtained for the hostname and the www. subdomain of the hostname
      // for the machine that we are running on.
      let domains = [Place.hostname]

      // If additional aliases have been specified, add those to the domains list.
      domains = domains.concat(this.aliases)
      options.domains = domains

      // Display aliases we’re responding to.
      if (this.aliases.length > 0) {
        const listOfAliases = this.aliases.reduce((prev, current) => {
          return `${prev}${current}, `
        }, '').slice(0, -2)
        this.log(`   👉    ❨Place❩ Aliases: also responding for ${listOfAliases}.`)
      } else {
        this.log(`   👉    ❨Place❩ No aliases. Only responding for ${Place.hostname}.`)
      }
    } else {
      this.log('   🚧    ❨Place❩ Using locally-trusted certificates.')
    }

    // Specify custom certificate directory for Place.
    options.settingsPath = path.join(Util.unprivilegedHomeDirectory(), '.small-tech.org', 'place', 'tls')

    // Create and return the HTTPS server.
    return https.createServer(options, requestListener)
  }

  // Starts serving the site.
  //   • callback: (function) the callback to call once the server is ready (defaults are provided).
  //
  // Can throw.
  async serve (callback) {
    // Before anything else, if this is a global server, let’s ensure that the domains we are trying to support
    // are reachable. If it is not, we will be prevented from going any further.
    // Note: this feature can be disabled by specifying the --skip-domain-reachability-check flag.
    if (this.global) {
      if (this.skipDomainReachabilityCheck !== true) {
        await ensureDomainsAreReachable(Place.hostname, this.aliases)
      } else {
        this.log('\n   🐇    ❨Place❩ Skipping domain reachability check as requested.')
      }
    }

    // Initialise the global database (reachable at global reference db).
    const databasePath = path.join(this.placePath, 'database')
    initialiseDatabase(databasePath)

    // Before starting the server, we have to configure the app. We do this here
    // instead of earlier in the constructor since the process is asynchronous.
    await this.configureApp()

    // Create the file watcher to watch for changes on dynamic routes.
    this.createFileWatcher()

    if (typeof callback !== 'function') {
      callback = this.defaultCallback
    }

    // Handle graceful exit.
    this.goodbye = (done) => {
      this.log('\n   💃    ❨Place❩ Preparing to exit gracefully, please wait…')

      // Close all active connections on the server.
      // (This is so that long-running connections – e.g., WebSockets – do not block the exit.)
      this.server.destroy(() => {
        // OK, it’s time to go :)
        this.log('\n   💕    ❨Place❩ Goodbye!\n')
        done()
      })
    }
    Graceful.on('SIGINT', this.goodbye)
    Graceful.on('SIGTERM', this.goodbye)

    // Start the server.
    this.server.listen(this.port, () => {
      // Call the overridable callback (the defaults for these are purely informational/cosmetic
      // so they are safe to override).
      callback.apply(this, [this.server])

      // TODO: Evaluate and re-implement auto-updates flow based on git for Place.
      // // Auto updates.
      // //
      // // If we’re running in production, set up a timer to periodically check for
      // // updates and perform them if necessary.
      // if (process.env.NODE_ENV === 'production') {

      //   const checkForUpdates = () => {
      //     this.log('   🛰    ❨Place❩ Running auto update check…')

      //     const options = {env: process.env, stdio: 'inherit'}

      //     let appReference = process.title
      //     if (appReference.includes('node')) {
      //       appReference = `${appReference} ${path.join(__dirname, 'bin', 'place')}`
      //     }
      //     const updateCommand = `${appReference} update --dont-log-app-name-and-version`
      //     childProcess.exec(updateCommand, options, (error, stdout, stderr) => {
      //       if (error !== null) {
      //         this.log(`\n   ❌    ${clr('❨Place❩ Error:', 'red')} Could not check for updates.\n`, error)
      //       } else {
      //         this.log(stdout)
      //       }
      //     })
      //   }

      //   this.log('   ⏰    ❨Place❩ Setting up auto-update check interval.')
      //   // Regular and alpha releases check for updates every 6 hours.
      //   // (You  should not be deploying servers using the alpha release channel.)
      //   let hours = 6
      //   let minutes = 60
      //   this.autoUpdateCheckInterval = setInterval(checkForUpdates, /* every */ hours * minutes * 60 * 1000)

      //   // And perform an initial check a few seconds after startup.
      //   setTimeout(checkForUpdates, 3000)
      // }
    })

    return this.server
  }

  //
  // Private.
  //

  prettyLocation () {
    let portSuffix = ''
    if (this.port !== 443) {
      portSuffix = `:${this.port}`
    }
    return this.global ? `${Place.hostname}${portSuffix}` : `localhost${portSuffix}`
  }


  showStatisticsUrl (location) {
    this.log(`\n   📊    ❨Place❩ For statistics, see https://${location}${this.stats.route}\n`)
  }


  // Callback used when none is provided.
  defaultCallback (server) {
    const location = this.prettyLocation()
    const prettyPathToServe = this.pathToServe === '.' ? 'current directory' : this.pathToServe
    this.log(`   🎉    ❨Place❩ Serving ${clr(prettyPathToServe, 'cyan')} on ${clr(`https://${location}`, 'green')}`)
    this.showStatisticsUrl(location)
  }


  // Restarts the server.
  async restartServer () {
    if (process.env.NODE_ENV === 'production') {
      // We’re running production, to restart the daemon, just exit.
      // (We let ourselves fall, knowing that systemd will catch us.) ;)
      process.exit()
    } else {
      // We’re running as a regular process. Just restart the server, not the whole process.
      if (this.restartingRegularProcess) {
        this.log('   🙈    ❨Place❩ Server restart requested while one is already in process. Ignoring…')
        return
      }

      this.restartingRegularProcess = true

      // Do some housekeeping.
      Graceful.off('SIGINT', this.goodbye)
      Graceful.off('SIGTERM', this.goodbye)

      // Wait until housekeeping is done cleaning up after the server is destroyed before
      // restarting the server.
      this.eventEmitter.on('housekeepingIsDone', async () => {
        // Restart the server.
        this.eventEmitter.removeAllListeners()
        this.log('\n   ⛺    ❨Place❩ Restarting server…\n')
        const {commandPath, args} = cli.initialise(process.argv.slice(2))
        const newPlace = new Place(this.options)
        await newPlace.serve(args)
        this.log('\n   ⛺    ❨Place❩ Server restarted.\n')
        this.restartingRegularProcess = false
        delete this
      })

      // Destroy the current server (so we do not get a port conflict on restart before
      // we’ve had a chance to terminate our own process).
      this.server.destroy(() => {
        this.log('\n   ⛺    ❨Place❩ Server destroyed.\n')
        this.server.removeAllListeners()
      })
    }
  }

  // Returns a pretty human-readable string describing the file watcher change reflected in the event.
  prettyFileWatcherEvent (event) {
    return ({
      'add': 'file added',
      'addDir': 'directory added',
      'change': 'file changed',
      'unlink': 'file deleted',
      'unlinkDir': 'directory deleted'
    }[event])
  }

  // Creates a file watcher to restart the server if a dynamic route changes.
  //
  // Note: Changes to the client being served do not restart the server. Please handle hot module replacement
  // or hot reload yourselves in your client project during development. For an example, using Snowpack,
  // please the Small Web Reference Client (Henry).
  //
  // Note: Chokidar appears to have an issue where changes are no longer picked up if
  // ===== a created folder is then removed. This should not be a big problem in actual
  //       usage, but let’s keep an eye on this. (Note that if you listen for the 'raw'
  //       event, it gets triggered with a 'rename' when a removed/recreated folder
  //       is affected.) See: https://github.com/paulmillr/chokidar/issues/404#issuecomment-666669336
  createFileWatcher () {
    const dynamicRoutesDirectory = path.join(__dirname, 'routes')
    const fileWatchPath = `${dynamicRoutesDirectory.replace(/\\/g, '/')}/**/*`

    this.app.__fileWatcher = chokidar.watch(fileWatchPath, {
      persistent: true,
      ignoreInitial: true
    })

    this.app.__fileWatcher.on ('all', async (event, file) => {
      this.log(`   🔭    ❨Place❩ Route change: ${clr(`${this.prettyFileWatcherEvent(event)}`, 'green')} (${clr(file, 'cyan')}).`)
      this.log('\n   🔭    ❨Place❩ Requesting restart…\n')
      await this.restartServer()
    })

    this.log('   🔭    ❨Place❩ Watching for changes to dynamic routes.')
  }
}

export default Place
