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

const _disable = require('../lib/disable')
const ensure = require('../lib/ensure')
const Place = require('../../index')

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

module.exports = disable
