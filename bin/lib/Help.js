//////////////////////////////////////////////////////////////////////
//
// Help class. Used by the Help command.
//
//////////////////////////////////////////////////////////////////////

import interfaceEngine from 'cliui'

import Place from '../../index.js'
import clr from '../../lib/clr.js'

const GREEN = 'green'
const YELLOW = 'yellow'
const CYAN = 'cyan'

class Help {

  constructor (systemdExists, isLinux, isWindows, isMac, wrap = false) {
    this.systemdExists = systemdExists
    this.isLinux = isLinux
    this.isWindows = isWindows
    this.isMac = isMac
    this.wrap = wrap
  }

  layout (text, width) {
    const interfaceLayout = interfaceEngine({wrap: this.wrap})

    text.forEach (line => {
      let leftPadding = 4
      // Pull decorations into the margin.
      if (line[0] && (line[0].startsWith(this.prompt) || line[0].startsWith('•'))) {
        leftPadding = 2
      }
      // Make sure single lines span the full width always.
      if (line[1] === undefined) {
        interfaceLayout.div({text: line[0] || '', padding: [0,0,0,leftPadding]})
      } else {
        interfaceLayout.div({text: line[0] || '', width, padding: [0,0,0,leftPadding]}, {text: line[1] || ''})
      }
    })
    return interfaceLayout
  }

  get text() {
    // Helper functions.
    function command(name) { return clr(name, GREEN) }
    const argument = (name) => {
    // On Windows @hostname and @localhost have to be quoted.
    if (this.isWindows && name.startsWith('@')) {
      name = `"${name}"`
    }
    return clr(name, CYAN)
    }
    function option(name) { name = `--${name}`; return `${clr(name, YELLOW)}` }
    function heading(title) { return clr(title, 'underline') }
    function emphasised(text) { return clr(text, 'italic') }

    const appName = 'place'

    const usageCommand = command('command')
    const usageFolder = argument('folder')
    const usageHostAndPort = argument('@host[:port]')
    const usageOptions = option('options')

    //
    // Commands.
    //

    const commandServe = command('serve')

    const commandPull = command('pull')
    const commandPush = command('push')

    const commandEnable = command('enable')
    const commandDisable = command('disable')
    const commandStart = command('start')
    const commandStop = command('stop')
    const commandRestart = command('restart')
    const commandLogs = command('logs')
    const commandStatus = command('status')

    const commandUpdate = command('update')
    const commandUninstall = command('uninstall')

    const commandVersion = command('version')
    const commandHelp = command('help')

    //
    // Options.
    //

    const optionAliases = option('aliases')
    const optionDomain = option('domain')
    const optionSkipDomainReachabilityCheck = option('skip-domain-reachability-check')

    const optionEnsureCanSync = option('ensure-can-sync')
    const optionAccessLogErrorsOnly = option('access-log-errors-only')
    const optionAccessLogDisable = option('access-log-disable')

    const optionWrap = option('wrap')

    // Black right-pointing triangle (U+25B6)
    // (There are several similar unicode gylphs but this is the one that works well across
    // Linux, macOS, and Windows).
    const prompt = clr('▶', 'blue')
    this.prompt = prompt

    Place.logAppNameAndVersion(/* compact */ true)

    let commandsContent = [
      [heading('Usage:'), ''],
      [],
      [clr(`If you want this help screen to wrap, pass the ${optionWrap} option.`, 'italic')],
      [clr(`(It doesn’t by default for accessibility reasons.)`, 'italic')],
      [],
      [`${prompt} ${clr(appName, 'bold')} [${usageCommand}] [${usageFolder}] [${usageHostAndPort}] [${usageOptions}]` ],
      [],
      [usageCommand, `${commandServe} | ${commandPull} | ${commandPush}${this.systemdExists ? `| ${commandEnable} | ${commandDisable} | ${commandStart} | ${commandStop} | ${commandRestart} | ${commandLogs} | ${commandStatus}` : ''} | ${commandUpdate} | ${commandUninstall} | ${commandVersion} | ${commandHelp}`],
      [usageFolder, `Path of folder to serve (defaults to current folder).`],
      [usageHostAndPort, `Host (and, optionally port) to serve. Valid hosts are @localhost and @hostname.`],
      [usageOptions,`Settings that alter command behaviour.`],
      [],
      [heading('Key:')],
      [],
      [`[] = optional  | = or  ${prompt} = command prompt`],
      [],
      [heading('Commands:')],
      [],
      [commandServe, `Serve specified ${argument('folder')} on specified ${argument('@host')} (at ${argument(':port')}, if given).`],
      ['', 'The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,'],
      [],
      ['', `${prompt} ${appName} ${commandServe} ${argument('my-folder')} ${argument('@localhost')}`],
      [],
      [commandPull, `Pull (download) your site from a remote Small Web server.`],
      [commandPush, `Push (deploy) your site to a remote Small Web server.`],
      []
    ]

    const commandsThatRequireSystemd = [
      [commandEnable, 'Start server as daemon with globally-trusted certificates and add to startup.'],
      [commandDisable, 'Stop server daemon and remove from startup.'],
      [commandStart, 'Start server as daemon with globally-trusted certificates.'],
      [commandStop, 'Stop server daemon.'],
      [commandRestart, 'Restart server daemon.'],
      [commandLogs, 'Display and tail server logs.'],
      [commandStatus, 'Display detailed server information.'],
      []
    ]

    if (this.systemdExists) {
      commandsContent = commandsContent.concat(commandsThatRequireSystemd)
    }

    const commandsFooter = [
      [commandUpdate, 'Check for Place updates and update if new version is found.'],
      [commandUninstall, 'Uninstall Place.'],
      [commandVersion, 'Display version and exit.'],
      [commandHelp, 'Display this help screen and exit.'],
      [],
      [`If ${usageCommand} is omitted, behaviour defaults to ${commandServe}.`],
      []
    ]

    commandsContent = commandsContent.concat(commandsFooter)
    const commandsLayout = this.layout(commandsContent, 17)

    let optionsContent = [
      [heading('Options:')],
      [],
      [`For${ this.systemdExists ? ' both' : '' } ${commandServe}${ this.systemdExists ? ` and ${commandEnable}` : '' } command${ this.systemdExists ? 's' : '' }:`],
      [],
      [optionDomain, 'The main domain to serve (defaults to system hostname if not specified).'],
      [optionAliases, 'Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.'],
      [optionSkipDomainReachabilityCheck, 'Do not run pre-flight check for domain reachability.'],
      [optionAccessLogErrorsOnly, 'Display only errors in the access log (HTTP status codes _4xx_ and _5xx_).'],
      [optionAccessLogDisable, 'Completely disable the access log. Not even errors are logged.'],
      []
    ]

    const optionsThatRequireSystemd = [
      [`For ${commandEnable} command:`],
      [],
      [optionEnsureCanSync, 'Ensure server can rsync via ssh.'],
      []
    ]

    if (this.systemdExists) {
      optionsContent = optionsContent.concat(optionsThatRequireSystemd)
    }

    const optionsFooter = [
      [`For both ${commandPull} and ${commandPush} commands:`],
      [],
      [optionDomain, 'Specify the domain to sync to manually (otherwise derived from the folder name).'],
      []
    ]

    optionsContent = optionsContent.concat(optionsFooter)
    const optionsLayout = this.layout(optionsContent, 37)

    let examplesContent = [
      [heading('Examples:')],
      [],
      [heading('Develop using locally-trusted TLS certificates:')],
      [],
      [`• Serve current folder`, `${prompt} ${appName}`],
      [emphasised('(all forms; shorthand to full syntax)'), `${prompt} ${appName} ${commandServe}`],
      ['', `${prompt} ${appName} ${commandServe} ${argument('.')}`],
      ['', `${prompt} ${appName} ${commandServe} ${argument('.')} ${argument('@localhost')}`],
      ['', `${prompt} ${appName} ${commandServe} ${argument('.')} ${argument('@localhost:443')}`],
      [],
      [`• Serve folder ${argument('demo')} ${emphasised('(shorthand)')}`, `${prompt} ${appName} ${argument('demo')}`],
      [`• Serve folder ${argument('demo')} at port 666`, `${prompt} ${appName} ${commandServe} ${argument('demo')} ${argument('@localhost:666')}`],
      [],
      [this.systemdExists ? heading('Stage and deploy using globally-trusted Let’s Encrypt certificates:') : heading('Stage using globally-trusted Let’s Encrypt certificates:')],
      [],
    ]

    const examplesThatRequireSystemd = [
      ['Regular process:'],
      []
    ]

    if (this.systemdExists) {
      examplesContent = examplesContent.concat(examplesThatRequireSystemd)
    }

    const regularProcessExamples = [
      [`• Serve current folder`, `${prompt} ${appName} ${argument('@hostname')}`],
      [`• Serve current folder at specified domain`, `${prompt} ${appName} ${argument('@hostname')} ${optionDomain}=${argument('my.site')}`],
      [`• Serve current folder also at aliases`, `${prompt} ${appName} ${argument('@hostname')} ${optionAliases}=${argument('www,other.site,www.other.site')}`],
      [],
      [`• Serve folder ${argument('demo')}`, `${prompt} ${appName} ${argument('demo')} ${argument('@hostname')}`],
      [emphasised('(shorthand and full)'), `${prompt} ${appName} ${commandServe} ${argument('demo')} ${argument('@hostname')}`],
      []
    ]

    examplesContent = examplesContent.concat(regularProcessExamples)

    const examplesThatRequireSystemd2 = [
      [`Start-up daemon:`],
      [],
      [`• Install & serve current folder as daemon `, `${prompt} ${appName} ${commandEnable}`],
      [`• Ditto & also ensure it can rsync via ssh`, `${prompt} ${appName} ${commandEnable} ${optionEnsureCanSync}`],
      [`• Get status of deamon`, `${prompt} ${appName} ${commandStatus}`],
      [`• Start server`, `${prompt} ${appName} ${commandStart}`],
      [`• Stop server`, `${prompt} ${appName} ${commandStop}`],
      [`• Restart server`, `${prompt} ${appName} ${commandRestart}`],
      [`• Display server logs`, `${prompt} ${appName} ${commandLogs}`],
      [`• Stop and uninstall current daemon`, `${prompt} ${appName} ${commandDisable}`],
      []
    ]

    if (this.systemdExists) {
      examplesContent = examplesContent.concat(examplesThatRequireSystemd2)
    }

    const examplesFooter = [
      [heading('General:')],
      [],
      [`• Check for updates and update if found`, `${prompt} ${appName} ${commandUpdate}`],
    ]

    examplesContent = examplesContent.concat(examplesFooter)
    const examplesLayout = this.layout(examplesContent, 45)

    const platformSpecificFooter = detectionMask => {
      const LINUX_WITHOUT_SYSTEMD = 'Linux'
      const MAC = 'Mac'
      const WINDOWS = 'Windows'
      const platform = detectionMask.map((isDetected, index) => isDetected ? [LINUX_WITHOUT_SYSTEMD, MAC, WINDOWS][index] : '').join('')
      const hasPlatformSpecificHeading = !(platform === '')

      const footerHeading = hasPlatformSpecificHeading ? [
        [],
        [heading(`${platform}-specific notes:`)]
      ] : []

      const platformSpecificFooterContent = (({
        Linux: [
          ['- Production use is not available on this Linux distribution as systemd does not exist.'],
          ['- For production use, we currently recommend using Ubuntu 18.04 LTS or 20.04 LTS.'],
          []
        ],
        Mac: [
          ['- Production use is not available on macOS as it requires Linux with systemd.'],
          []
        ],
        Windows: [
          ['- Unlike Linux and macOS, you must use quotation marks around @localhost and @hostname.'],
          ['- Production use is not available on Windows as it requires Linux with systemd.'],
          [],
        ]
      })[platform]) || [[]]

      const footerFooter = [
        [clr('For further information, please see https://place.small-web.org', 'italic')],
        []
      ]

      return footerHeading.concat(platformSpecificFooterContent).concat(footerFooter)
    }

    const footerContent = platformSpecificFooter([this.isLinux && !this.systemdExists, this.isMac, this.isWindows])
    const footerLayout = this.layout(footerContent)

    const outputLayout = `${commandsLayout}\n${optionsLayout}\n${examplesLayout}\n${footerLayout}`

    return outputLayout.toString()
  }
}

export default Help
