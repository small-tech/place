////////////////////////////////////////////////////////////////////////////////
//
// Middleware: initialise database.
//
// Initialises the global JSDB database reachable as db.
//
////////////////////////////////////////////////////////////////////////////////

import fs from 'fs-extra'
import JSDB from '@small-tech/jsdb'

export default function (databasePath) {
  // If a JavaScript Database (JSDB) database exists for the current app, load it in right now (since this is a
  // relatively slow process, we want it to happen at server start, not while the server is up and running and during
  // a request.). If a database doesn’t already exist, we don’t want to pollute the project directory with a database
  // directory unnecessarily so we  create a global property accessor to instantiates a database instance on first
  // attempt to access it.
  if (fs.existsSync(databasePath)) {
    // We still create the _db property so we can use that to check if a database exist during graceful shutdown
    // instead of possibly accessing the accessor defined in the other branch of this conditional, thereby
    // triggering it to be created when all we want to do is perform housekeeping.
    console.log('   💾    ❨Place❩ Opening database.')
    globalThis._db = JSDB.open(databasePath)
    globalThis.db = globalThis._db
    console.log('   💾    ❨Place❩ Database ready.')
  } else {
    // We check for existence first as the property will already exist if this is a server restart.
    if (!globalThis.db) {
      Object.defineProperty(globalThis, 'db', {
        get: (function () {
          if (!globalThis._db) {
            console.log('   💾    ❨Place❩ Lazily creating database.')
            globalThis._db = JSDB.open(databasePath)
            console.log('   💾    ❨Place❩ Database ready.')
          }
          return globalThis._db
        }),
        set: (function (value) { if (value !== globalThis.db) { globalThis.db = value} }),
        configurable: true
      })
    }
  }
}
