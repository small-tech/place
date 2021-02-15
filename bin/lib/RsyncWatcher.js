////////////////////////////////////////////////////////////////////////////////
//
// Watch files and directories then sync them to the remote server using rsync.
//
// Fork of rysnc watcher by Mikhail Kalashnik <splurov@gmail.com>
// (http://mkln.ru/en/).
//
// You can find the original module at:
// https://github.com/Splurov/rsync-watch
//
// Original license: CC-BY-4.0.
//
// This version modified by: Aral Balkan and licensed under AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////
import path from 'path'
import { EventEmitter } from 'events'

import chokidar from 'chokidar'
import debounce from 'debounce'
import Graceful from 'node-graceful'

import Rsync from '@small-tech/rsync-with-portable-cygwin-path-support-on-windows'

import clr from '../../lib/clr.js'
import consoleTimestamp from './console-timestamp.js'

class RSyncWatcher extends EventEmitter {

  constructor (options) {

    super()

    this.options = options
    this.synchronisers = new Map()
    this.watchers = []

    // Exit gracefully.
    const goodbye = (done) => {

      for (let entry of this.synchronisers) {
          let synchroniser = entry[1]
          console.log(`   💫    ❨Place❩ Stopping sync process.`)
          synchroniser.process.kill()
      }

      for (let watcher of this.watchers) {
          console.log(`   🚮    ❨Place❩ Removing sync watcher.`)
          watcher.watcher.close()
      }
      done()
    }
    Graceful.timeout = 3000
    Graceful.on('SIGINT', goodbye)
    Graceful.on('SIGTERM', goodbye)

    for (let project in this.options) {
      this.sync(project).then(() => {
        const syncHandler = this.options[project].sync
        if (typeof syncHandler === 'function') {
          syncHandler()
        }
        this.watch(project)
      }).catch(error => {
        const errorHandler = this.options[project].error
        if (typeof errorHandler === 'function') {
          // Error handler callback.
          errorHandler.apply(null, [error])
        } else {
          // Generic error handler.
          consoleTimestamp.error(`[${project} | sync error] `, error)
        }
      })
    }
  }

  sync(project) {

    let folderToSync = this.options[project].from

    // It’s important for rsync whether or not the folder to sync ends with a slash or not: if it does, it means
    // “copy the contents of this folder but not the folder itself”. If it doesn’t end with a slash, it means
    // ”copy the folder and its contents.”
    const folderToSyncEndsWithASlash = folderToSync.endsWith('/')

    if (!path.isAbsolute(folderToSync)) {
      folderToSync = path.resolve(path.join(process.cwd(), folderToSync))

      // Add the slash back, if there was one, as it is being stripped out due to the path methods.
      if (folderToSyncEndsWithASlash) {
        folderToSync = `${folderToSync}/`
      }
    }

    const config = this.options[project].config || {}

    const source = this.options[project].isPull ? this.options[project].to : folderToSync
    const destination = this.options[project].isPull ?  folderToSync : this.options[project].to

    const rsync = new Rsync(config)
    .exclude(this.options[project].exclude || [])
    .source(source)
    .destination(destination)

    for (let optionKey in (this.options[project].rsyncOptions || {})) {
      rsync.set(optionKey, this.options[project].rsyncOptions[optionKey]);
    }

    console.log(`   💫    ❨Place❩ Sync starting…`)

    return new Promise((resolve, reject) => {
      const rsyncProcess = rsync.execute((error, code, command) => {
        if (error) {
          reject(error)
          return
        }

        console.log(`   💫    ❨Place❩ Sync complete.`)
        this.emit('rsync-complete')
        resolve(rsyncProcess.pid)
      }, (data) => {
        const message = data.toString('ascii')

        // Debug
        // console.log(`\n>${message}<\n`)
        // console.log(message.match(''))

        // These can arrive as one line or as two lines due to the streaming nature of the output
        // so we will display them as two lines always to ensure we catch them.
        const statisticsLine1 = message.match(/sent (\d+) bytes\s*received (\d+) bytes\s*([\d\.]+) bytes\/sec/)
        const statisticsLine2 = message.match(/total size is ([\d\.]+)K/)

        if (message === 'sending incremental file list\n') {
          console.log(`   💫    ❨Place❩ Calculating sync changes…`)
        } else if (statisticsLine1 || statisticsLine2) {
          if (statisticsLine1) {
            console.log(`   💫    ❨Place❩ Sync ↑ ${statisticsLine1[1]} bytes ↓ ${statisticsLine1[2]} bytes (${statisticsLine1[3]} bytes/sec)`)
          }
          if (statisticsLine2) {
            console.log(`   💫    ❨Place❩ ${statisticsLine2[1]} KB synced.`)
          }
        } else {
          const lines = message.split('\n')
          lines.filter(value => value !== '' && !value.startsWith('\r')).forEach(line => console.log(`   💫    ❨Place❩ Sync: ${line}`))
        }
      })

      rsyncProcess.on('close', () => {
        this.synchronisers.delete(rsyncProcess.pid)
      })

      this.synchronisers.set(rsyncProcess.pid, {project, process: rsyncProcess})
    })
  }

  watch(project) {

    let folderToWatch = this.options[project].from
    if (!path.isAbsolute(folderToWatch)) {
      folderToWatch = path.resolve(path.join(process.cwd(), folderToWatch))
    }

    // If the folder to watch is ./, that’s valid for rsync but not for chokidar,
    // so remove the slash.
    if (folderToWatch === './') folderToWatch = '.'

    const watcher = chokidar.watch(folderToWatch, {
      ignoreInitial: true,
      ignored: this.options[project].exclude || null,
      cwd: folderToWatch,
    })

    this.watchers.push({project, watcher})

    const syncDebounced = debounce(() => {
      this.sync(project)
      .catch(error => {
          console.log(`\n   ❌    ${clr('❨Place❩ Sync error:', 'red')} ${error}\n`)
      })
    }, 500)

    watcher
    .on('ready', () => {
        const watchHandler = this.options[project].watch
        if (typeof watchHandler === 'function') {
          watchHandler()
        } else {
          consoleTimestamp.log(`[watch] ${project}`)
        }
    })
    .on('all', (event, path) => {
        const watchEventHandler = this.options[project].watchEvent
        if (typeof watchEventHandler === 'function') {
          watchEventHandler(event, path)
        } else {
          consoleTimestamp.log(`[watch | ${event}] ${path}`)
        }
        syncDebounced();
    })
    .on('error', (error) => {
        const watchErrorHandler = this.options[project].watchError
        if (typeof watchErrorHandler === 'function') {
          watchErrorHandler(error)
        } else {
          consoleTimestamp.error(`[${project} | watch error] `, error)
        }
    })
  }
}

export default RSyncWatcher
