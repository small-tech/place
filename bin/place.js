#!/usr/bin/env node
import cli from './lib/cli.js'

// While testing elevated privileges on Windows, if you are getting
// an error and you do not want the window to close before you can
// see it, temporarily uncomment the following line:
// process.stdin.resume()

import disable from './commands/disable.js'
import enable from './commands/enable.js'
import help from './commands/help.js'
import logs from './commands/logs.js'
import restart from './commands/restart.js'
import serve from './commands/serve.js'
import start from './commands/start.js'
import status from './commands/status.js'
import stop from './commands/stop.js'
import uninstall from './commands/uninstall.js'
import version from './commands/version.js'

const commands = {
  disable, enable, help, logs, restart, serve, start, status, stop, uninstall, version
}

try {
  const {commandName, args} = cli.initialise(process.argv.slice(2))
  commands[commandName](args)
} catch (error) {
  console.log(error)
  process.exit(1)
}
