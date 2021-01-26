//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: start
//
// Starts the Place daemon.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import _start from '../lib/start.js'
import ensure from '../lib/ensure.js'
import Place from '../../index.js'

function start () {
  Place.logAppNameAndVersion()

  ensure.systemctl()
  ensure.root()

  try {
    // Start the web server.
    _start()
  } catch (error) {
    process.exit(1)
  }
}

export default start
