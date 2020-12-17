//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: help
//
// Displays the help screen and exits.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

const ensure = require('../lib/ensure')
const Help = require('../lib/Help')

// Platform detection.
const systemdExists = ensure.commandExists('systemctl')
const isLinux = process.platform === 'linux'
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

function help (args) {
  const wrap = args.named['wrap']
  const help = new Help(systemdExists, isLinux, isWindows, isMac, wrap)

  console.log(help.text)
  process.exit()
}

module.exports = help
