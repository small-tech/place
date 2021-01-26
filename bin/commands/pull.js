//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: pull
//
// Pushes the current or specified folder to a remote server using
// the sync feature.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import path from 'path'

import Place from '../../index.js'
import sync from '../lib/sync.js'
import clr from '../../lib/clr.js'

function pull (args) {
  // Make sure the local path ends with the path separator so that the contents of the folder
  // are synced and not the folder itself.
  const _pathToPull = args.positional[0] || '.'
  const pathToPull = _pathToPull.endsWith(path.sep) ? _pathToPull : `${_pathToPull}${path.sep}`

  const absolutePathToPull = path.resolve(pathToPull)

  const pathFragments = absolutePathToPull.split(path.sep)
  const directoryToPull = pathFragments[pathFragments.length -1]

  // Either use the convention that the directory should be named with the domain
  // to pull to or, if an override has been provided in the --domain option, use that.
  const host = args.named.domain || directoryToPull
  const account = 'small-web'
  const remotePath = '/home/small-web/public/'

  const to = `${account}@${host}:${remotePath}`

  const options = {
    from: pathToPull,
    to,
    account,
    host,
    remotePath,
    isPull: true,
    live: false,
    includeDatabase: false
  }

  if (args.named.db) {
    options.includeDatabase = true
  }

  Place.logAppNameAndVersion()

  console.log(`\n   ⏪    ❨Place❩ Pulling from ${clr(host, 'yellow')} to ${clr(pathToPull, 'yellow')}\n`)

  sync(options)
}

export default pull
