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

const _restart = require('../lib/restart')
const ensure = require('../lib/ensure')
const Place = require('../../index')

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

module.exports = restart
