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
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const git = require('isomorphic-git')
const generateEFFDicewarePassphrase = require('eff-diceware-passphrase')
const session25519 = require('session25519')
const crypto = require('crypto')

async function create (args) {

  Place.logAppNameAndVersion()

  let folder = '.'
  if (args.positional.length === 1) {
    folder = args.positional[0]
  }

  const placePath = path.resolve(folder)

  const lastPathSeparator = placePath.lastIndexOf(path.sep)
  const placeDomain = placePath.slice(lastPathSeparator + 1)
  const placePathParent = placePath.slice(0, lastPathSeparator)

  //
  // Safety checks: let’s not overwrite anything that might
  // already exist.
  //

  if (!fs.existsSync(placePathParent)) {
    console.log(` ❌️ Parent folder ${chalk.yellow(placePathParent)} does not exist.`)
    console.log(chalk.hsl(329,100,50)('\n    Refusing to continue.'))
    process.exit(1)
  }

  if (fs.existsSync(placePath)) {
    if (fs.readdirSync(placePath).length !== 0) {
      console.log(` ❌️ Folder ${chalk.yellow(placePath)} is not empty.`)
      console.log(chalk.hsl(329,100,50)('\n    Refusing to continue.'))
      process.exit(1)
    }
  }

  // Do not overwrite place data path if it exists without asking first.
  const placeDataPath = path.join(Place.settingsDirectory, placeDomain)

  if (fs.existsSync(placeDataPath)) {
    console.log(` ⚠️  There is existing data and settings for ${chalk.yellow(placeDomain)} at ${chalk.yellow(placeDataPath)}.`)

    const confirmOverwriteOfPlaceData = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ok',
        prefix: ' 🙋',
        message: 'Continuing will overwrite this data. Are you sure?',
        default: false
      }
    ])

    if (confirmOverwriteOfPlaceData.ok) {
      // Remove the existing data directory.
      fs.removeSync(placeDataPath)
      console.log(` ✔️  Existing data and settings for ${chalk.yellow(placeDomain)} deleted.`)
    } else {
      console.log('\n ❌️ Aborting!')
      console.log(chalk.hsl(329,100,50)('\n    Goodbye.'))
      process.exit(1)
    }
  }

  //
  // Safety checks passed.
  //

  console.log(` ℹ️  Your Small Web place will be created at ${chalk.green(placePath)}\n`)

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
  console.log(`    Domain    : ${placeDomain} ⃰`)
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

  console.log('\n ✨️ Creating your Small Web place…\n')

  // Make sure the path exists.
  fs.ensureDirSync(placePath)

  const spinner = ora({
    text: '',
    color: 'cyan'
  })

  console.log(` ✔️  Creating data path at ${placeDataPath}.`)
  fs.ensureDirSync(placeDataPath)

  //
  // Create keys from the passphrase and persist the public keys
  // (we do not persist the private keys as these should only ever
  // be used on the client. This could be running in an untrusted node
  // e.g., on a virtual private server somewhere).
  //
  spinner.text = 'Generating keys…'
  spinner.start()

  const publicKeys = await generatePublicKeys(placeDomain, passphrase)

  spinner.stopAndPersist({ symbol: ' ✔️ ', text: 'Public keys generated.' })

  const publicKeysPath = path.join(placeDataPath, 'public-keys.json')

  fs.writeFileSync(publicKeysPath, `${JSON.stringify(publicKeys, null, 2)}\n`)

  console.log(' ✔️  Public keys stored.')

  // Derive Git password from the passphrase.
  // TODO

  // Derive SSH key from the passphrase.
  // TODO


  //
  // Create the git repository.
  //

  spinner.text = 'Initialising source code repository…'
  spinner.start()

  // Initialise the git repository.
  await git.init({ fs, dir: placePath})

  // Add remotes for the domain name (as derived from the folder name), localhost (for local testing), Local Area Network IP address (for same LAN testing), and hostname (for staging via PageKite, etc.).
  await git.addRemote ({ fs, dir: placePath, remote: 'origin', url: `https://${placeDomain}/source/self`})
  await git.addRemote ({ fs, dir: placePath, remote: 'localhost', url: 'https://localhost/source/self'})
  await git.addRemote ({ fs, dir: placePath, remote: 'hostname', url: `https://${os.hostname()}/source/self`})

  const localAreaNetworkInterfaces = allLocalInterfaces().filter(value => value !== '127.0.0.1')
  if (localAreaNetworkInterfaces.length > 0) {
    await git.addRemote ({ fs, dir: placePath, remote: 'ip', url: `https://${localAreaNetworkInterfaces[0]}/source/self`})
  }

  spinner.stopAndPersist({ symbol: ' ✔️ ', text: 'Source code repository initialised.' })
}

module.exports = create

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


// function generateKeys (domain, passphrase) {
//   return new Promise((resolve, reject) => {
//     session25519(domain, passphrase, (error, keys) => {
//       if (error) {
//         return reject(error)
//       }

//       resolve({
//         signing: {
//           secret: toHex(keys.secretSignKey),
//           public: toHex(keys.publicSignKey)
//         },
//         encryption: {
//           secret: toHex(keys.secretKey),
//           public: toHex(keys.publicKey)
//         }
//       })
//     })
//   })
// }


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
