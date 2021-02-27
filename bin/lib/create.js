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

import Place from '../../index.js'
import inquirer from 'inquirer'
import ora from 'ora'
import os from 'os'
import fs from 'fs-extra'
import path from 'path'
import chalk from 'chalk'
import EFFDicewarePassphrase from '@small-tech/eff-diceware-passphrase'
import session25519 from 'session25519'
import crypto from 'crypto'

import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node/index.js'

async function create (domain, client, placePath, clientPath) {

  Place.logAppNameAndVersion()

  //
  // Safety checks: let’s not overwrite anything that might
  // already exist without asking.
  //

  // If there is already content in the place path, let’s ask if we should
  // continue and also flag that we shouldn’t install a new template (as that
  // would override the content).
  if (fs.existsSync(placePath)) {
    console.log(` ❌️ Place at ${chalk.yellow(placePath)} already exists. Refusing to continue.`)
    process.exit(1)
  }

  //
  // Safety checks passed.
  //

  console.log(` ℹ️  Your Small Web place will be created at ${chalk.green(placePath)}\n`)

  const generateEFFDicewarePassphrase = new EFFDicewarePassphrase(crypto)
  let passphrase
  let passphraseConfirmation

  console.log(chalk.yellow(' 🤫️ Please save your randomly-generated strong passphrase somewhere safe'))
  console.log(chalk.yellow(chalk.italic('    (e.g., in a secure password manager like 1password, etc.)')))

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

  // Get the client

  const details = await inquirer
  .prompt([
    {
      type: 'list',
      name: 'client',
      prefix: ' 🙋',
      message: 'Template',
      choices: ['Small Web Reference Client (Henry)', 'Small Web Social Network (Meep)', 'Small Web Host (Basil)', 'Other'],
      when: client === undefined
    },
    {
      type: 'input',
      prefix: ' 🙋',
      name: 'customClient',
      message: 'Client git distribution URL',
      default: 'https://source.small-tech.org/small-web/henry-dist.git',
      when: function (details) {
        return details.client === 'Other'
      },
      validate: function (value) {
        return value.startsWith('https://') || 'Must start with https://'
      }
    }
  ])

  if (details.client) {
    switch (details.client) {
      case 'Small Web Reference Client (Henry)':
        client = 'https://source.small-tech.org/small-web/henry-dist.git'
        break
      case 'Small Web Social Network (Meep)':
        client = 'https://source.small-web.org/small-web/meep-dist.git'
        break
      case 'Small Web Host (Basil)':
        client = 'https://source.small-web.org/small-web/basil-dist.git'
        break
      default:
        // Custom URL
        client = details.client
    }
  }

  // Default to Small Web Refence Client (Henry)
  if (client === undefined) {
    client = 'https://source.small-tech.org/small-web/henry-dist.git'
  }

  // Show the summary and get confirmation before starting the process.

  console.log('')
  console.log('    Summary')
  console.log('    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log(`    Domain    : ${domain}`)
  console.log(`    Folder    : ${placePath}`)
  console.log(`    Client    : ${client}`)
  console.log('')
  console.log('    Passphrase: ')
  console.log('')
  console.log(`    ${passphrase}`)
  console.log('')
  console.log(chalk.italic(chalk.yellow('    (Please make sure you save your passphrase in your password manager.)')))
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

  console.log('\n ✨️ Creating your Small Web place…\n')

  // Make sure the path exists.
  console.log(` ✔️  Creating place at ${placePath}.`)
  fs.ensureDirSync(placePath)

  const spinner = ora({
    text: '',
    color: 'cyan'
  })

  //
  // Create keys from the passphrase and persist the public keys
  // (we do not persist the private keys as these should only ever
  // be used on the client. This could be running in an untrusted node
  // e.g., on a virtual private server somewhere).
  //
  spinner.text = 'Generating keys…'
  spinner.start()

  const publicKeys = await generatePublicKeys(domain, passphrase)

  spinner.stopAndPersist({ symbol: ' ✔️ ', text: 'Public keys generated.' })

  const publicKeysPath = path.join(placePath, 'public-keys.json')

  fs.writeFileSync(publicKeysPath, `${JSON.stringify(publicKeys, null, 2)}\n`)

  console.log(' ✔️  Public keys stored.')

  // Derive Git password from the passphrase.
  // TODO

  // Derive SSH key from the passphrase.
  // TODO

  // Clone the client.
  spinner.text = `Cloning client from ${client}…`
  spinner.start()

  await git.clone({
    fs,
    http,
    dir: clientPath,
    url: client,
    singleBranch: true,
    depth: 1
  })

  spinner.stopAndPersist({ symbol: ' ✔️ ', text: 'Client cloned.' })

  console.log(' ✔️  Place created.')

  return { client }
}

export default create

//
// Private
//

function generatePublicKeys (salt, passphrase) {
  return new Promise((resolve, reject) => {
    // The salts, being based on domains, satisfy the uniqueness property but they can be short
    // (relative to the size of the key material). To discourage rainbow tables, we use a blake2b-512
    // hash of the passed shorter salt).
    salt = crypto.createHash('blake2b512').update(salt).digest('hex')
    session25519(salt, passphrase, (error, keys) => {
      if (error) {
        return reject(error)
      }

      resolve({
        signing: toHex(keys.publicSignKey),
        encryption: toHex(keys.publicKey)
      })
    })
  })
}

// From libsodium.
function toHex(input) {
  // Disable input checking for this simple spike.
  // input = _any_to_Uint8Array(null, input, "input");
  var str = "",
    b,
    c,
    x;
  for (var i = 0; i < input.length; i++) {
    c = input[i] & 0xf;
    b = input[i] >>> 4;
    x =
      ((87 + c + (((c - 10) >> 8) & ~38)) << 8) |
      (87 + b + (((b - 10) >> 8) & ~38));
    str += String.fromCharCode(x & 0xff) + String.fromCharCode(x >>> 8);
  }
  return str;
}
