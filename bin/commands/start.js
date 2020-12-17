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

const _start = require('../lib/start')
const ensure = require('../lib/ensure')
const Place = require('../../index')

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

module.exports = start
