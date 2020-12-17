//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: logs
//
// Displays the Place server daemon logs.
//
// Proxies: journalctl --follow --unit web-server
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')
const Place = require('../../index')
const ensure = require('../lib/ensure')

function logs () {
  Place.logAppNameAndVersion()
  ensure.journalctl()
  console.log(`   📜    ❨Place❩ Tailing logs (press Ctrl+C to exit).\n`)
  childProcess.spawn('journalctl', ['--since', 'today', '--no-pager', '--follow', '--unit', 'place'], {env: process.env, stdio: 'inherit'})
}

module.exports = logs
