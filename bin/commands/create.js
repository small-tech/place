//////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Command: create
//
// Creates a new place.
//
// Copyright ⓒ 2019-2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
//////////////////////////////////////////////////////////////////////

const Place = require('../../index')
const inquirer = require('inquirer')
const ora = require('ora')
const os = require('os')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const generateEFFDicewarePassphrase = require('eff-diceware-passphrase')

async function create (args) {

  Place.logAppNameAndVersion()

  let folder = '.'
  if (args.positional.length === 1) {
    folder = args.positional[0]
  }

  const placePath = path.resolve(folder)

  const lastPathSeparator = placePath.lastIndexOf(path.sep)
  const domainFromPlacePath = placePath.slice(lastPathSeparator + 1)
  const placePathParent = placePath.slice(0, lastPathSeparator)

  if (!fs.existsSync(placePathParent)) {
    console.log(` ❌️ Parent folder ${chalk.yellow(placePathParent)} does not exist.`)
    console.log(chalk.hsl(329,100,50)('\n    Refusing to continue.'))
    process.exit(1)
  }

  if (fs.existsSync(placePath)) {
    if (fs.readdirSync(placePath).length !== 0) {
      console.log(` ❌️ Folder ${chalk.yellow(placePath)} not empty.`)
      console.log(chalk.hsl(329,100,50)('\n    Refusing to continue.'))
      process.exit(1)
    }
  }

  console.log(` ℹ️  Your small web place will be created at ${chalk.green(placePath)}\n`)

  let passphrase
  let passphraseConfirmation

  console.log(' 🤫️ Please save your randomly-generated strong passphrase somewhere safe (e.g., 1password, etc.):')

  // const passphraseSpinner = ora({
  //   text: 'Generating passphrase',
  //   color: 'cyan',
  //   symbol: '✔️',
  //   indent: 8,
  // })

  do {
    passphrase = generateEFFDicewarePassphrase.entropy(100).join (' ')

    const line = '━'.repeat(passphrase.length+2)
    console.log(`\n  ┏${line}┓`,)
    console.log(`  ┃ ${passphrase} ┃`,)
    console.log(`  ┗${line}┛\n`,)

    passphraseConfirmation = await inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'ok',
        prefix: ' 🙋',
        message: 'Is this passphrase ok?',
        default: true
      }
    ])
  } while (passphraseConfirmation.ok === false)

  // Get the rest of the details (domain, template, etc.)

  const details = await inquirer
  .prompt([
    {
      type: 'list',
      prefix: ' 🙋',
      name: 'domain',
      message: 'Domain',
      choices: [`Development default based on folder name (${domainFromPlacePath})`, `Production default based on hostname (${os.hostname()})`, 'Custom']
    },
    {
      type: 'input',
      prefix: ' 🙋',
      name: 'customDomain',
      message: 'Custom domain',
      default: os.hostname(),
      when: function (details) {
        return details.domain === 'Custom'
      }
    },
    {
      type: 'list',
      name: 'template',
      prefix: ' 🙋',
      message: 'Template',
      choices: ['Default', 'Meep', 'Custom']
    },
    {
      type: 'input',
      prefix: ' 🙋',
      name: 'customTemplate',
      message: 'Custom template URL',
      default: 'https://place.small-web.org/template/default',
      when: function (details) {
        return details.template === 'Custom'
      },
      validate: function (value) {
        return value.startsWith('https://') || 'Must start with https://'
      }
    }
  ])

}

module.exports = create

//
// Private
//

function allLocalInterfaces () {
  // Support all local interfaces so that the machine can be reached over the local network via IPv4.
  // This is very useful for testing with multiple devices over the local area network without needing to expose
  // the machine over the wide area network/Internet using a service like ngrok.
  return Object.entries(os.networkInterfaces())
  .map(iface =>
    iface[1].filter(addresses =>
      addresses.family === 'IPv4')
      .map(addresses => addresses.address)).flat()
}
