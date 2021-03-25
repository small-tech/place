#!/usr/bin/env node

// Runs Place in development mode using Nodemon
// to manage restarts on code changes.
import nodemon from 'nodemon'
import chalk from 'chalk'

import { fileURLToPath } from 'url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

function prettyFilePath (filePath) {
  return filePath.replace(__dirname, '')
}

nodemon(`bin/place.js -- ${process.argv.slice(2).join(' ')}`)
.on('restart', (changedFiles) => {
  const numberOfChangedFiles = changedFiles.length
  if (numberOfChangedFiles > 0) {
    const firstFile = chalk.green(prettyFilePath(changedFiles[0]))
    const otherFilesIfAny = numberOfChangedFiles > 1 ? `(${chalk.cyan(` and ${numberOfChangedFiles - 1} others`)})` : ''

    console.log(`\n   🤓️    ❨Place❩ Code changed in ${firstFile}${otherFilesIfAny}.\n`)
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
  console.log(`\n   🤯️    ${chalk.red('❨Place❩ Crashed!')}`)
  console.log(chalk.yellow.italic('         Waiting for code change to restart…'))
})
