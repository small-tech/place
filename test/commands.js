////////////////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Test command-line interface commands by executing them in the shell.
//
// Note: if you are using nvm, for these tests to pass, you must create symbolic
// ===== links from your /usr/local/bin folder to your current version of Node.
//
// e.g.,
// sudo ln -s /home/aral/.nvm/versions/node/v14.15.0/bin/node /usr/local/bin/node
// sudo ln -s /home/aral/.nvm/versions/node/v14.15.0/bin/npm /usr/local/bin/npm
//
// Untested: - uninstall, - update
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////

const os = require('os')
const fs = require('fs-extra')
const test = require('tape')
const childProcess = require('child_process')
const path = require('path')
const Place = require('../index.js')
const Help = require('../bin/lib/Help')
const ensure = require('../bin/lib/ensure')

process.env['QUIET'] = true

async function secureGet (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const statusCode = response.statusCode
      const location = response.headers.location

      // Reject if it’s not one of the status codes we are testing.
      if (statusCode !== 200 && statusCode !== 404 && statusCode !== 500 && statusCode !== 302) {
        reject({statusCode})
      }

      let body = ''
      response.on('data', _ => body += _)
      response.on('end', () => {
        resolve({statusCode, location, body})
      })
    })
  })
}

function options(timeout = 0) {
  // Ensure that the command logs to console (as tests are being run with QUIET=true in the environment.)
  let env = Object.assign({}, process.env)
  delete env['QUIET']

  return { env, timeout }
}

function fundingMessage() {
  return dehydrate(`
    ╔═══════════════════════════════════════════╗
    ║ Like this? Fund us!                       ║
    ║                                           ║
    ║ We’re a tiny, independent not-for-profit. ║
    ║ https://small-tech.org/fund-us            ║
    ╚═══════════════════════════════════════════╝
  `)
}

_manifest = null
function manifest () {
  if (_manifest === null) {
    try {
      _manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf-8'))
    } catch (error) {
      // When running under Node (not wrapped as a binary), there will be no manifest file. So mock one.
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

      // Note: we switch to __dirname because we need to if Place is running as a daemon from source.
      _manifest = {
        releaseChannel: 'npm',
        // Note: the time is a guess based on the minutes at:
        // http://undocs.org/en/A/PV.183 ;)
        binaryVersion: '19481210233000',
        packageVersion: (require(path.join('..', 'package.json'))).version,
        sourceVersion,
        platform: {linux: 'linux', win32: 'windows', 'darwin': 'macOS'}[os.platform()],
        architecture: os.arch()
      }
    }
  }
  return _manifest
}

function placeLogo () {
  return dehydrate('⛺')
}

function creationDateLine () {
  return dehydrate(`Created ${Place.binaryVersionToHumanReadableDateString(manifest().binaryVersion)}`)
}

function binaryVersionLine () {
  return dehydrate(`Version ${manifest().binaryVersion}-${manifest().packageVersion}-${manifest().sourceVersion}-${manifest().platform}/${manifest().architecture}`)
}

function nodeVersionLine () {
  return dehydrate(`Node.js ${process.version.replace('v', '')}`)
}

function nexeBaseLink () {
  return dehydrate(`https://place.small-web.org/nexe/${process.platform}-${process.arch}-${process.version.replace('v', '')}`)
}

function sourceLink () {
  return dehydrate(`https://source.small-tech.org/place/app/-/tree/${manifest().sourceVersion}`)
}

function dehydrate (str) {
  if (typeof str !== 'string') {
    str = str.toString('utf-8')
  }
  return str.replace(/\s/g, '')
}

function outputForCommand(command) {
  return dehydrate(childProcess.execSync(command, options()))
}

function _(commandPartial) {
  return `node ${path.join('bin', 'place')} ${commandPartial}`
}

test('[commands] version', t => {
  t.plan(6)

  const command = _('version')
  const actualOutput = outputForCommand(command)

  t.ok(actualOutput.includes(placeLogo()), 'version screen includes Place header')
  t.ok(actualOutput.includes(creationDateLine()), 'version screen includes creation date line')
  t.ok(actualOutput.includes(binaryVersionLine()), 'version screen includes binary version line')
  t.ok(actualOutput.includes(nodeVersionLine()), 'version screen includes Node.js version line')
  t.ok(actualOutput.includes(nexeBaseLink()), 'version screen includes nexe base link')
  t.ok(actualOutput.includes(sourceLink()), 'version screen includes source link')
  t.end()
})


test('[commands] systemd startup daemon', t => {

  //
  // Commands used in the tests.
  //
  const enableCommand = _('enable test/site')
  const disableCommand = _('disable')
  const startCommand = _('start')
  const stopCommand = _('stop')
  const restartCommand = _('restart')
  const statusCommand = _('status')

  // Startup daemons are only supported on platforms with systemd.
  if (process.platform === 'win32' || process.platform === 'darwin' || !ensure.commandExists('systemctl')) {
    const expectedErrorMessage = dehydrate('❌ ❨Place❩ Error: Daemons are only supported on Linux systems with systemd (systemctl required).')
    const commandsToTest = ['enable', 'disable', 'start', 'stop', 'restart', 'status']

    commandsToTest.forEach(commandName => {
      try {
        outputForCommand(eval(`${commandName}Command`))
      } catch (error) {
        t.ok(dehydrate(error.output[1].toString()).includes(expectedErrorMessage), `On non-supported systems, daemon command ${commandName} fails gracefully as expected`)
      }
    })

    t.end()

    return
  }

  t.plan(19)

  //
  // Setup.
  //

  // Ensure server isn’t active or enabled first.
  try { outputForCommand(stopCommand) } catch (error) {
    // OK if this fails (it will fail if server wasn’t enabled).
  }
  try { outputForCommand(disableCommand) } catch (error) {
    // OK if this fails (it will fail if server wasn’t enabled).
  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // Server is disabled.
  //
  ////////////////////////////////////////////////////////////////////////////////

  //
  // Status should display correctly when server is disabled.
  //
  const expectedOutputForStatusCommandWhenServerIsDisabled = dehydrate('🛑 ❨Place❩ Place daemon is inactive and disabled.')
  const actualOutputForStatusCommandWhenServerIsDisabled = outputForCommand(statusCommand)
  t.ok(actualOutputForStatusCommandWhenServerIsDisabled.includes(expectedOutputForStatusCommandWhenServerIsDisabled), 'Server status should display correctly when server is disabled')

  //
  // Disable command should fail when server is disabled.
  //

  const expectedOutputForDisableCommandWhenServerIsDisabled = dehydrate('❌ ❨Place❩ Error: Place daemon is not enabled. Nothing to disable.')
  try {
    outputForCommand(disableCommand)
  } catch (error) {
    t.pass('Disable command fails as expected when server is already disabled')
    const actualOutputForDisableCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.ok(actualOutputForDisableCommandWhenServerIsDisabled.includes(expectedOutputForDisableCommandWhenServerIsDisabled), 'Disable command should fail when server is disabled')
  }

  //
  // Start command should fail when server is disabled.
  //
  const expectedOutputForStartCommandWhenServerIsDisabled = dehydrate('❌ ❨Place❩ Error: Place daemon is not enabled. Please run place enable to enable it.')
  try {
    outputForCommand(startCommand)
  } catch (error) {
    t.pass('Start command fails as expected when server is disabled')
    const actualOutputForStartCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.ok(actualOutputForStartCommandWhenServerIsDisabled.includes(expectedOutputForStartCommandWhenServerIsDisabled), 'Start command should fail when server is disabled')
  }

  //
  // Stop command should fail when server is disabled.
  //
  const expectedOutputForStopCommandWhenServerIsDisabled = dehydrate('❌ ❨Place❩ Error: Place daemon is not active. Nothing to stop.')
  try {
    outputForCommand(stopCommand)
  } catch (error) {
    t.pass('Stop command fails as expected when server is not active')
    const actualOutputForStopCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.ok(actualOutputForStopCommandWhenServerIsDisabled.includes(expectedOutputForStopCommandWhenServerIsDisabled), 'Stop command should fail when server is disabled')
  }

  //
  // Restart command should fail when server is disabled.
  //
  const expectedOutputForRestartCommandWhenServerIsDisabled = dehydrate('❌ ❨Place❩ Error: Place daemon is not enabled. Please run place enable to enable it.')
  try {
    outputForCommand(restartCommand)
  } catch (error) {
    t.pass('Restart command fails as expected when server is not active')
    actualOutputForRestartCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.ok(actualOutputForRestartCommandWhenServerIsDisabled.includes(expectedOutputForRestartCommandWhenServerIsDisabled), 'Restart command should fail when server is not active')
  }

  //
  // Enable command.
  //

  //
  // Test: enable when not enabled should succeed.
  //
  const expectedOutputForEnableCommand = dehydrate(`
    😈 ❨Place❩ Launched as daemon on https://${Place.hostname} serving test/site
    😈 ❨Place❩ Installed daemon for auto-launch at startup.

    👍 ❨Place❩ You’re all set!`)

  const actualOutputForEnableCommand = outputForCommand(enableCommand)

  t.ok(actualOutputForEnableCommand.includes(expectedOutputForEnableCommand), 'Enable command should succeed when server is not enabled')

  ////////////////////////////////////////////////////////////////////////////////
  //
  // Server is enabled.
  //
  ////////////////////////////////////////////////////////////////////////////////

  //
  // Status should display correctly when server is enabled.
  //
  const expectedOutputForStatusCommandWhenServerIsEnabled = dehydrate(`💡 ❨Place❩ Place daemon is active and enabled.`)
  const actualOutputForStatusCommandWhenServerIsEnabled = outputForCommand(statusCommand)
  t.ok(actualOutputForStatusCommandWhenServerIsEnabled.includes(expectedOutputForStatusCommandWhenServerIsEnabled), 'Server status should display correctly when server is enabled')


  //
  // Enable command should fail when server is enabled.
  //
  const expectedOutputForEnableCommandWhenServerIsEnabled = dehydrate('❌ ❨Place❩ Error: Place daemon is already running. Please stop it before retrying using: place disable')
  try {
    outputForCommand(enableCommand)
  } catch (error) {
    t.pass('Enable command fails as expected when server is enabled')
    const actualOutputForEnableCommandWhenServerIsEnabled = dehydrate(error.stdout)
    t.ok(actualOutputForEnableCommandWhenServerIsEnabled.includes(expectedOutputForEnableCommandWhenServerIsEnabled), 'Enable command should fail when server is enabled')
  }

  //
  // Stop command should succeed when server is active.
  //
  const expectedOutputForStopCommandWhenServerIsActive = dehydrate('🎈 ❨Place❩ Place daemon stopped.')
  const actualOutputForStopCommandWhenServerIsActive = outputForCommand(stopCommand)
  t.ok(actualOutputForStopCommandWhenServerIsActive.includes(expectedOutputForStopCommandWhenServerIsActive), 'Stop command should succeed when server is active')

  //
  // Server status should display correctly when server is enabled but inactive.
  //
  const expectedOutputForStatusCommandWhenServerIsEnabledButInactive = dehydrate('🛑 ❨Place❩ Place daemon is inactive and enabled.')
  const actualOutputForStatusCommandWhenServerIsEnabledButInactive = outputForCommand(statusCommand)
  t.ok(actualOutputForStatusCommandWhenServerIsEnabledButInactive.includes(expectedOutputForStatusCommandWhenServerIsEnabledButInactive), 'Server status should display correctly when server is enabled but inactive')

  //
  // Start command should succeed when server is inactive.
  //
  const expectedOutputForStartCommandWhenServerIsEnabledButInactive = dehydrate('🎈 ❨Place❩ Place daemon started.')
  const actualOutputForStartCommandWhenServerIsEnabledButInactive = outputForCommand(startCommand)
  t.ok(actualOutputForStartCommandWhenServerIsEnabledButInactive.includes(expectedOutputForStartCommandWhenServerIsEnabledButInactive), 'Start command should succeed when server is inactive')

  //
  // Restart command should succeed when server is enabled but inactive.
  //

  // Stop the server first.
  /* ignore the */ outputForCommand(stopCommand)

  const restartCommandSuccessOutput = dehydrate('🎈 ❨Place❩ Place daemon restarted.')
  const expectedOutputForRestartCommandWhenServerIsEnabledButInactive = restartCommandSuccessOutput
  const actualOutputForRestartCommandWhenServerIsEnabledButInactive = outputForCommand(restartCommand)
  t.ok(actualOutputForRestartCommandWhenServerIsEnabledButInactive.includes(expectedOutputForRestartCommandWhenServerIsEnabledButInactive), 'Restart command should succeed when server is enabled but inactive')

  //
  // Restart command should succeed when server is active.
  //

  const expectedOutputForRestartCommandWhenServerIsEnabled = restartCommandSuccessOutput
  const actualOutputForRestartCommandWhenServerIsEnabled = outputForCommand(restartCommand)
  t.ok(actualOutputForRestartCommandWhenServerIsEnabled.includes(expectedOutputForRestartCommandWhenServerIsEnabled), 'Restart command should succeed when server is active')

  //
  // Disable command should succeed when server is enabled.
  //

  const expectedOutputForDisableCommand = dehydrate('🎈 ❨Place❩ Place daemon stopped and removed from startup.')
  const actualOutputForDisableCommand = outputForCommand(disableCommand)
  t.ok(actualOutputForDisableCommand.includes(expectedOutputForDisableCommand), 'Disable command should succeed when server is enabled')

  t.end()
})


// Note that these tests will not catch whitespace differences in the Help output
// due to the dehydration.
test('[commands] help', t => {
  t.plan(4)

  // NB. parameter order: systemdExists, isLinux, isWindows, isMac
  const linuxWithSystemdHelp = dehydrate((new Help(true, true, false, false)).text)
  const linuxWithoutSystemdHelp = dehydrate((new Help(false, true, false, false)).text)
  const windowsHelp = dehydrate((new Help(false, false, true, false)).text)
  const macHelp = dehydrate((new Help(false, false, false, true)).text)

  const linuxWithSystemdExpectedHelpOutput = dehydrate(`
  Usage:

  If you want this help screen to wrap, pass the --wrap option.
  (It doesn’t by default for accessibility reasons.)

▶ place [command] [folder] [@host[:port]] [--options]

  command    serve | pull | push | enable | disable | start | stop | restart | logs | status | update | uninstall | version | help
  folder  Path of folder to serve (defaults to current folder).
  @host[:port]  Host (and, optionally port) to serve. Valid hosts are @localhost and @hostname.
  --options    Settings that alter command behaviour.

  Key:

  [] = optional  | = or  ▶ = command prompt

  Commands:

  serve  Serve specified folder on specified @host (at :port, if given).
      The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,

          ▶ place serve my-folder @localhost

  pull  Pull (download) your site from a remote Small Web server.
  push  Push (deploy) your site to a remote Small Web server.

  enable  Start server as daemon with globally-trusted certificates and add to startup.
  disable  Stop server daemon and remove from startup.
  start  Start server as daemon with globally-trusted certificates.
  stop  Stop server daemon.
  restart  Restart server daemon.
  logs  Display and tail server logs.
  status  Display detailed server information.

  update  Check for Place updates and update if new version is found.
  uninstall  Uninstall Place.

  version  Display version and exit.
  help  Display this help screen and exit.

  If command is omitted, behaviour defaults to serve.

  Options:

  For both serve and enable commands:

  --domain                          The main domain to serve (defaults to system hostname if not specified).
  --aliases                         Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
  --skip-domain-reachability-check  Do not run pre-flight check for domain reachability.
  --access-log-errors-only          Display only errors in the access log (HTTP status codes _4xx_ and _5xx_).
  --access-log-disable              Completely disable the access log. Not even errors are logged.

  For enable command:

  --ensure-can-sync    Ensure server can rsync via ssh.

  For both pull and push commands:

  --domain         Specify the domain to sync to manually (otherwise derived from the folder name).

  Examples:

    Develop using locally-trusted TLS certificates:

  • Serve current folder       ▶ place
    (all forms; shorthand to full syntax)  ▶ place serve
                ▶ place serve .
                ▶ place serve . @localhost
                ▶ place serve . @localhost:443

  • Serve folder demo (shorthand)    ▶ place demo
  • Serve folder demo at port 666    ▶ place serve demo @localhost:666

    Stage and deploy using globally-trusted Let’s Encrypt certificates:

    Regular process:

  • Serve current folder      ▶ place @hostname
  • Serve current folder at specified domain	▶ place @hostname --domain=my.site
  • Serve current folder also at aliases  ▶ place @hostname --aliases=www,other.site,www.other.site

  • Serve folder demo        ▶ place demo @hostname
    (shorthand and full)      ▶ place serve demo @hostname

    Start-up daemon:

  • Install & serve current folder as daemon  ▶ place enable
  • Ditto & also ensure it can rsync via ssh  ▶ place enable --ensure-can-sync
  • Get status of deamon                      ▶ place status
  • Start server                              ▶ place start
  • Stop server                               ▶ place stop
  • Restart server                            ▶ place restart
  • Display server logs                       ▶ place logs
  • Stop and uninstall current daemon         ▶ place disable

    General:

  • Check for updates and update if found     ▶ place update

  For further information, please see https://place.small-web.org
  `)

  t.strictEquals(linuxWithSystemdHelp, linuxWithSystemdExpectedHelpOutput, 'Actual help output should match expected output (linux with systemd)')

  const linuxWithoutSystemdExpectedHelpOutput = dehydrate(`
    Usage:

    If you want this help screen to wrap, pass the --wrap option.
    (It doesn’t by default for accessibility reasons.)

  ▶ place [command] [folder] [@host[:port]] [--options]
    command    serve | pull | push | update | uninstall | version | help
    folder  Path of folder to serve (defaults to current folder).
    @host[:port]  Host (and, optionally port) to serve. Valid hosts are @localhost and @hostname.

    --options    Settings that alter command behaviour.

    Key:
    [] = optional  | = or  ▶ = command prompt

    Commands:

    serve  Serve specified folder on specified @host (at :port, if given).
        The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,
            ▶ place serve my-folder @localhost

    pull  Pull (download) your site from a remote Small Web server.
    push  Push (deploy) your site to a remote Small Web server.

    update  Check for Place updates and update if new version is found.
    uninstall  Uninstall Place.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For serve command:

    --domain          The main domain to serve (defaults to system hostname if not specified).
    --aliases         Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
    --skip-domain-reachability-check  Do not run pre-flight check for domain reachability.
    --access-log-errors-only            Display only errors in the access log (HTTP status codes _4xx_ and _5xx_).
    --access-log-disable                Completely disable the access log. Not even errors are logged.

    For both pull and push commands:

    --domain         Specify the domain to sync to manually (otherwise derived from the folder name).

    Examples:
      Develop using locally-trusted TLS certificates:
    • Serve current folder       ▶ place
      (all forms; shorthand to full syntax)  ▶ place serve
                  ▶ place serve .
                  ▶ place serve . @localhost
                  ▶ place serve . @localhost:443
    • Serve folder demo (shorthand)    ▶ place demo
    • Serve folder demo at port 666    ▶ place serve demo @localhost:666

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ place @hostname
    • Serve current folder at specified domain ▶ place @hostname --domain=my.site
    • Serve current folder also at aliases  ▶ place @hostname --aliases=www,other.site,www.other.site

    • Serve folder demo        ▶ place demo @hostname
      (shorthand and full)      ▶ place serve demo @hostname

      General:

    • Check for updates and update if found     ▶ place update

    Linux-specific notes:
      - Production use is not available on this Linux distribution as systemd does not exist.
      - For production use, we currently recommend using Ubuntu 18.04 LTS or 20.04 LTS.

    For further information, please see https://place.small-web.org
  `)

  t.strictEquals(linuxWithoutSystemdHelp, linuxWithoutSystemdExpectedHelpOutput, 'Actual help output should match expectated output (linux without systemd)')


  const windowsExpectedHelpOutput = dehydrate(`
    Usage:

    If you want this help screen to wrap, pass the --wrap option.
    (It doesn’t by default for accessibility reasons.)

  ▶ place [command] [folder] ["@host[:port]"] [--options]
    command    serve | pull | push | update | uninstall | version | help
    folder  Path of folder to serve (defaults to current folder).
    "@host[:port]"  Host (and, optionally port) to serve. Valid hosts are @localhost and @hostname.
    --options    Settings that alter command behaviour.
    Key:
    [] = optional  | = or  ▶ = command prompt
    Commands:
    serve  Serve specified folder on specified "@host" (at :port, if given).
        The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,
            ▶ place serve my-folder "@localhost"

    pull  Pull (download) your site from a remote Small Web server.
    push  Push (deploy) your site to a remote Small Web server.

    update  Check for Place updates and update if new version is found.
    uninstall  Uninstall Place.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For serve command:

    --domain                        The main domain to serve (defaults to system hostname if not specified).
    --aliases                       Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
    --skip-domain-reachability-check  Do not run pre-flight check for domain reachability.
    --access-log-errors-only            Display only errors in the access log (HTTP status codes _4xx_ and _5xx_).
    --access-log-disable                Completely disable the access log. Not even errors are logged.

    For both pull and push commands:

    --domain         Specify the domain to sync to manually (otherwise derived from the folder name).

    Examples:
      Develop using locally-trusted TLS certificates:
    • Serve current folder       ▶ place
      (all forms; shorthand to full syntax)  ▶ place serve
                  ▶ place serve .
                  ▶ place serve . "@localhost"
                  ▶ place serve . "@localhost:443"
    • Serve folder demo (shorthand)    ▶ place demo
    • Serve folder demo at port 666    ▶ place serve demo "@localhost:666"

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ place "@hostname"
    • Serve current folder at specified domain ▶ place "@hostname" --domain=my.site
    • Serve current folder also at aliases  ▶ place "@hostname" --aliases=www,other.site,www.other.site

    • Serve folder demo        ▶ place demo "@hostname"
      (shorthand and full)      ▶ place serve demo "@hostname"

      General:

    • Check for updates and update if found     ▶ place update

    Windows-specific notes:
      - Unlike Linux and macOS, you must use quotation marks around @localhost and @hostname.
      - Production use is not available on Windows as it requires Linux with systemd.

    For further information, please see https://place.small-web.org
  `)

  t.strictEquals(windowsHelp, windowsExpectedHelpOutput, 'Actual help output should match expected output (windows)')

  const macExpectedHelpOutput = dehydrate(`
    Usage:

    If you want this help screen to wrap, pass the --wrap option.
    (It doesn’t by default for accessibility reasons.)

  ▶ place [command] [folder] [@host[:port]] [--options]
    command    serve | pull | push | update | uninstall | version | help
    folder  Path of folder to serve (defaults to current folder).
    @host[:port]  Host (and, optionally port) to serve. Valid hosts are @localhost and @hostname.

    --options    Settings that alter command behaviour.

    Key:
    [] = optional  | = or  ▶ = command prompt

    Commands:

    serve  Serve specified folder on specified @host (at :port, if given).
           The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,
             ▶ place serve my-folder @localhost

    pull  Pull (download) your site from a remote Small Web server.
    push  Push (deploy) your site to a remote Small Web server.

    update  Check for Place updates and update if new version is found.
    uninstall  Uninstall Place.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For serve command:

    --domain                        The main domain to serve (defaults to system hostname if not specified).
    --aliases                       Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
    --skip-domain-reachability-check  Do not run pre-flight check for domain reachability.
    --access-log-errors-only            Display only errors in the access log (HTTP status codes _4xx_ and _5xx_).
    --access-log-disable                Completely disable the access log. Not even errors are logged.

    For both pull and push commands:

    --domain         Specify the domain to sync to manually (otherwise derived from the folder name).

    Examples:
      Develop using locally-trusted TLS certificates:
    • Serve current folder       ▶ place
      (all forms; shorthand to full syntax)  ▶ place serve
                  ▶ place serve .
                  ▶ place serve . @localhost
                  ▶ place serve . @localhost:443
    • Serve folder demo (shorthand)    ▶ place demo
    • Serve folder demo at port 666    ▶ place serve demo @localhost:666

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ place @hostname
    • Serve current folder at specified domain ▶ place @hostname --domain=my.site
    • Serve current folder also at aliases  ▶ place @hostname --aliases=www,other.site,www.other.site

    • Serve folder demo        ▶ place demo @hostname
      (shorthand and full)      ▶ place serve demo @hostname

      General:

    • Check for updates and update if found     ▶ place update

    Mac-specific notes:
      - Production use is not available on macOS as it requires Linux with systemd.

    For further information, please see https://place.small-web.org
  `)

  t.strictEquals(macHelp, macExpectedHelpOutput, 'Actual help output should match expected output (mac)')

  t.end()
})

test('[commands] logs', t => {
  // Startup daemons are only supported on platforms with systemd.
  if (process.platform === 'win32' || process.platform === 'darwin' || !ensure.commandExists('systemctl')) {
    const errorMessage = 'Sorry, daemons are only supported on Linux systems with systemd (journalctl required).'

    try {
      childProcess.exec(_('logs'))
    } catch (error) {
      t.ok(dehydrate(error.output[1].toString()).includes(errorMessage), 'On non-supported systems, daemon command logs fails gracefully as expected')
    }

    t.end()
    return
  }

  // Note: setting the buffer size higher than should be required in case there are a lot of logs
  // (as logs prints out the logs for the current day) so that we don’t fail due to a max buffer size error on stdout.
  const optionsWithTimeout = options(1000)
  const optionsWithTimeoutAndMaxBufferSize = Object.assign({ maxBuffer: 1024 * 50000 }, optionsWithTimeout)
  childProcess.exec(_('logs'), optionsWithTimeoutAndMaxBufferSize, (error, stdout, stderr) => {
    // This will end with an error due to the timeout. Ensure that the error is the one we expect.
    t.true(error, 'process termination is as expected')
    t.true(error.killed, 'logs process was killed by us')
    t.strictEquals(error.signal, 'SIGTERM', 'logs process was terminated in the manner we expect')

    actualOutput = dehydrate(stdout)
    t.true(actualOutput.includes(dehydrate('📜 ❨Place❩ Tailing logs (press Ctrl+C to exit).')), 'stdout includes our header')
    t.true(actualOutput.includes(dehydrate('-- Logs begin at')), 'stdout includes journalctl header')
    t.end()
  })
})
