// Runs Place in development mode using Nodemon
// to manage restarts on code changes.
import nodemon from 'nodemon'
import clr from './lib/clr.js'

const __dirname = new URL('.', import.meta.url).pathname

function prettyFilePath (filePath) {
  return filePath.replace(__dirname, '')
}

nodemon({ script: 'bin/place.js' })
  .on('restart', (changedFiles) => {
    const numberOfChangedFiles = changedFiles.length
    if (numberOfChangedFiles > 0) {
      const firstFile = clr(prettyFilePath(changedFiles[0]), 'green')
      const otherFilesIfAny = numberOfChangedFiles > 1 ? `(${clr(` and ${numberOfChangedFiles - 1} others`, 'cyan')})` : ''

      console.log(`   🤓️    ❨Place❩ Code changed in ${firstFile}${otherFilesIfAny}.\n`)
      console.log('   🔄    ❨Place❩ Restarting server…\n\n')
    }
  })
  .on('exit', (reason) => {
    if (reason === undefined) {
      // This is what we get if the person signals they want to quit
      // using Ctrl+C. So, actually quit. Otherwise, let Nodemon manage it.
      process.exit(0)
    }
  })
  .on('crash', () => {
    console.log('DEV crashed')
  })
