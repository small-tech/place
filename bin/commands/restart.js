//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: restart
//
// Restarts the Place daemon.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import _restart from '../lib/restart.js'
import ensure from '../lib/ensure.js'
import Place from '../../index.js'

function restart () {
  Place.logAppNameAndVersion()

  ensure.systemctl()
  ensure.root()

  try {
    // Restart the web server.
    _restart()
  } catch (error) {
    process.exit(1)
  }
}

export default restart
