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
const generateEFFDicewarePassphrase = require('eff-diceware-passphrase')

async function create (args) {

  Place.logAppNameAndVersion()

  let passphrase
  let passphraseConfirmation

  console.log('Please save your randomly-generated strong passphrase somewhere safe (e.g., 1password, etc.):')

  do {
    passphrase = await generatePassphrase()
    console.log(`\n${passphrase}\n`)
    passphraseConfirmation = await inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'ok',
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
      name: 'domain',
      message: 'Domain',
      default: 'none'
    },
    {
      type: 'list',
      name: 'template',
      message: 'Template',
      choices: ['Default', 'Meep', 'Custom']
    },
    {
      type: 'input',
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

// Returns a promise that resolves to a passphrase.
function generatePassphrase () {
  return new Promise (resolve => {
    // On next tick, so the interface has a chance to update.
    setTimeout(() => {
      const passphrase = generateEFFDicewarePassphrase.entropy(100).join (' ')
      resolve(passphrase)
    }, 0)
  })
}

