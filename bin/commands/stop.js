//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: stop
//
// Stops the Place daemon.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import _stop from '../lib/stop.js'
import ensure from '../lib/ensure.js'
import Place from '../../index.js'

function stop () {
  Place.logAppNameAndVersion()

  ensure.systemctl()
  ensure.root()

  try {
    // Stop the web server.
    _stop()
  } catch (error) {
    Place.log(error)
    process.exit(1)
  }
}

export default stop
