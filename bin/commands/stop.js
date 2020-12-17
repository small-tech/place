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

const _stop = require('../lib/stop')
const ensure = require('../lib/ensure')
const Place = require('../../index')

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

module.exports = stop
