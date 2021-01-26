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

import ensure from '../lib/ensure.js'
import Help from '../lib/Help.js'

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

export default help
