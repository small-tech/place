//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: update
//
// Checks for updates and updates Place if new version is found.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

import https from 'https'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

import tar from 'tar-stream'
import gunzip from 'gunzip-maybe'
import concat from 'concat-stream'

import Place from '../../index.js'
import ensure from '../lib/ensure.js'
import status from '../lib/status.js'
import restart from '../lib/restart.js'

import clr from '../../lib/clr'

async function update () {
  const platform = os.platform()
  const cpuArchitecture = os.arch()
  const isLinux = platform === 'linux'

  const releaseChannel = Place.releaseChannel

  Place.logAppNameAndVersion()
  ensure.root()

  console.log(`\n   🧐    ❨Place❩ Checking for ${releaseChannel} updates…\n`)

  let response
  try {
    response = await secureGet(`https://place.small-web.org/version/${releaseChannel}`)
  } catch (error) {
    console.log(`   ❌    ${clr('❨Place❩ Error:', 'red')} Could not check for ${releaseChannel} updates.\n`)
    console.log(error)
    exitGracefully(1)
    return
  }

  const latestVersion = response.body
  const currentVersion = Place.binaryVersion

  const humanReadableCurrentVersion = Place.humanReadableBinaryVersion
  const humanReadableLatestVersion = Place.binaryVersionToHumanReadableDateString(latestVersion)

  const showDetails = () => {
    console.log(`         ────────────────────────────────────────────────`)
    console.log(`         Latest version : ${latestVersion}`)
    console.log(`         Released on    : ${humanReadableLatestVersion}`)
    console.log(`         ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`)
    console.log(`         Current version: ${currentVersion}`)
    console.log(`         Released on    : ${humanReadableCurrentVersion}`)
    console.log(`         ────────────────────────────────────────────────\n`)
  }

  if (currentVersion !== latestVersion) {
    // Are we running a newer version than the latest release version?
    if (currentVersion > latestVersion) {
      console.log(`   🤓    ❨Place❩ You’re running an unreleased version.`)
      showDetails()
      exitGracefully()
      return
    }

    // The current version is not newer than the latest version and we know
    // that it isn’t equal to the release version so it must be older. Let’s update!
    console.log(`   🎁    ❨Place❩ A new version of Place is available.`)
    showDetails()

    //
    // Compose the right binary URL for the platform and architecture.
    //

    let platformPath = {
      'linux': 'linux',
      'darwin': 'macos',
      'win32': 'windows'
    }[platform]

    if (platformPath === 'linux' && cpuArchitecture === 'arm') {
      platformPath = `${platformPath}-arm`
    }

    let binaryUrl = `https://place.small-web.org/binaries/${releaseChannel}/${platformPath}/${latestVersion}.tar.gz`

    console.log(`   📡    ❨Place❩ Downloading Place ${releaseChannel} version ${latestVersion}…`)

    let latestReleaseResponse
    try {
      latestReleaseResponse = await secureGetBinary(binaryUrl)
    } catch (error) {
      console.log(`   ❌    ${clr('❨Place❩ Error:', 'red')} Could not download update.\n`)
      console.log(error)
      exitGracefully(1)
      return
    }

    const latestRelease = latestReleaseResponse.body

    console.log('   📦    ❨Place❩ Installing…')

    if (platform === 'win32') {
      // Windows cannot reference count (aww, bless), so, of course, we have
      // to do something special for it. In this case, while unlinking fails
      // with an EPERM error, we can rename the file and that works.
      const backupFilePath = path.join('C:', 'Program Files', 'place', 'old-place.exe')

      // If a backup file exists from the last time we did an update, mark
      // it for deletion.
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath)
      }

      // Rename the current version.
      fs.renameSync(binaryPath(), backupFilePath)
    } else {
      // On Linux-like systems, unlink the old file. This will succeed even if
      // the executable is currently running.
      fs.unlinkSync(binaryPath())
    }

    // Extract the latest release in memory from the gzipped tarball.
    await extract(latestRelease)

    // Check if the server daemon is running. If so, restart it so it uses
    // the latest version of Place.
    if (isLinux) {
      if (ensure.commandExists('systemctl')) {
        const { isActive } = status()
        if (isActive) {
          console.log(`   😈    ❨Place❩ Daemon is running on old version. Restarting it using Place ${releaseChannel} version ${latestVersion}…`)

          try {
            restart()
          } catch (error) {
            console.log(`   ❌    ${clr('❨Place❩ Error:', 'red')} Could not restart the Place daemon.\n`)
            console.log(error)
            exitGracefully(1)
            return
          }
        }
      }
    }
    console.log('   🎉    ❨Place❩ Done!\n')
  } else {
    console.log('   👍    ❨Place❩ You’re running the latest version of Place!\n')
  }
  exitGracefully()
  return
}

export default update

//
// Helpers.
//

// Note: since this does not exit immediately on Windows, follow all calls to this
// ===== function with a return as the expectation will be that execution of the
//       current function should stop immediately even if the exit is delayed.
function exitGracefully(code = 0) {
  if (os.platform() === 'win32') {
    // On Windows, a new window pops up with Administrator privileges. Wait a few seconds so the
    // person can see the output in it before it closes.
    process.stdout.write('This window will close in 3…')
    setTimeout(_=>{
      process.stdout.write(' 2…')
      setTimeout(_=>{
        process.stdout.write(' 1…')
        setTimeout(_=>{
          process.exit(code)
        }, 1000)
      }, 1000)
    }, 1000)
  } else {
    // All other proper operating systems may exit immediately.
    process.exit(code)
  }
}


function binaryPath () {
  return os.platform() === 'win32' ? path.join('C:', 'Program Files', 'place', 'place.exe') : '/usr/local/bin/place'
}


async function extract (release) {
  return new Promise((resolve, reject) => {
    const extractTar = tar.extract()

    extractTar.on('entry', (header, stream, next) => {
      // There should be only one file in the archive and it should either be called place (Linuxesque)
      // or place.exe (Windows).
      if (header.name === 'place' || header.name === 'place.exe') {
        stream.pipe(concat(executable => {
          fs.writeFileSync(binaryPath(), executable, { mode: 0o755 })
          resolve()
        }))
      } else {
        console.log(`   ❌    ${clr('❨Place❩ Error:', 'red')} Unknown file encountered: ${header.name}`)
        reject()
      }
    })

    bufferToStream(release).pipe(gunzip()).pipe(extractTar)
  })
}


async function secureGet (url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {timeout: 10 /* seconds */ * 1000}, response => {
      const code = response.statusCode

      if (code !== 200) {
        reject({code})
      }

      let body = ''
      response.on('data', _ => body += _)
      response.on('end', () => {
        resolve({code, body})
      })
    })

    request.on('timeout', () => {
      request.abort()
    })

    request.on('error', (error) => {
      if (error.code === "ECONNRESET") {
        console.log('   😱    ❨Place❩ Connection timed out while attempting to check for updates.')
        reject()
        return
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`   😱    ❨Place❩ Connection was refused. Site might be down. ${error}`)
        reject()
      } else {
        // Catch-all. Just display the error.
        console.log(`   ❌    ${clr('❨Place❩ Error:', 'red')} ${error}`)
        reject()
      }
    })
  })
}


async function secureGetBinary (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const code = response.statusCode

      if (code !== 200) {
        reject({code})
      }

      let chunks = []
      response.on('data', _ => chunks.push(_))
      response.on('end', () => {
        const body = Buffer.concat(chunks)
        resolve({code, body})
      })
    })
  })
}


// Takes a binary buffer and returns a Readable instance stream.
// Courtesy: https://stackoverflow.com/a/54136803
 function bufferToStream(binary) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary)
      this.push(null)
    }
  })

  return readableInstanceStream
}
