//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: version
//
// Display the version and exit.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import Place from '../../index.js'

function version () {
  Place.logAppNameAndVersion()
  process.exit()
}

export default version
