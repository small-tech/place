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
const generateEFFDicewarePassphrase = require('eff-diceware-passphrase')

async function create (args) {

  Place.logAppNameAndVersion()

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

    const line = '═'.repeat(passphrase.length+2)
    console.log(`\n    ╔${line}╗`,)
    console.log(`    ║ ${passphrase} ║`,)
    console.log(`    ╚${line}╝\n`,)

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
      type: 'input',
      prefix: ' 🙋',
      name: 'domain',
      message: 'Domain',
      default: 'none'
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
