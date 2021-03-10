//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: disable
//
// Disables the Place daemon (stops it and removes it
// from startup items).
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import _disable from '../lib/disable.js'
import ensure from '../lib/ensure.js'
import Place from '../../index.js'

function disable () {
  Place.logAppNameAndVersion()

  ensure.systemctl()
  ensure.root()

  try {
    // Disable and stop the web server.
    _disable()
  } catch (error) {
    process.exit(1)
  }
}

export default disable
