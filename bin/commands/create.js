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

  console.log(` ℹ️  Your Small Web place will be created at ${chalk.green(placePath)}\n`)

  let passphrase
  let passphraseConfirmation

  console.log(chalk.yellow(' 🤫️ Please save your randomly-generated strong passphrase somewhere safe'))
  console.log(chalk.yellow(chalk.italic('    (e.g., in a secure password manager like 1password, etc.)')))

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
        message: 'Do you like this passphrase?',
        default: true
      }
    ])
  } while (passphraseConfirmation.ok === false)

  // Get the rest of the details (domain, template, etc.)

  const details = await inquirer
  .prompt([
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

  // Show the summary and get confirmation before starting the process.

  console.log('')
  console.log('    Summary')
  console.log('    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log(`    Folder    : ${placePath}`)
  console.log(`    Domain    : ${domainFromPlacePath} ⃰`)
  console.log(`    Template  : ${details.customTemplate || details.template}`)
  console.log('')
  console.log('    Passphrase: ')
  console.log('')
  console.log(`    ${passphrase}`)
  console.log('')
  console.log(chalk.italic(chalk.yellow('    (Please make sure you save your passphrase in your password manager.)')))
  console.log('')
  console.log(chalk.italic('    ⃰ The domain is automatically derived from the folder name.'))
  console.log('    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  const confirmCreate = await inquirer
  .prompt([
    {
      type: 'confirm',
      name: 'ok',
      prefix: ' 🙋',
      message: 'Continue with these settings?',
      default: true
    }
  ])

  if (!confirmCreate.ok) {
    console.log('\n ❌️ Aborting!')
    console.log(chalk.hsl(329,100,50)('\n    Goodbye.'))
    process.exit(1)
  }

  console.log('\n ✨️ Creating your Small Web place…')

  // TODO.
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
