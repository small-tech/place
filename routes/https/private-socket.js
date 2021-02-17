import Place from '../../index.js'
import sodiumPlus from 'sodium-plus'
const { SodiumPlus, X25519PublicKey } = sodiumPlus
import tweetnaclUtil from 'tweetnacl-util'
const { decodeBase64 } = tweetnaclUtil

// Check every minute and prune sign-in paths that haven’t been used in the last ten seconds.
setInterval(() => {
  const now = Date.now()
  if (db.privateRoutes) {
    db.privateRoutes.forEach((privateRoute, index) => {
      if (privateRoute.createdAt === privateRoute.accessedAt && (now - privateRoute.createdAt > 10000)) {
        console.log('Pruning unused private path', privateRoute)
        db.privateRoutes.splice(index, 1)
      }
    })
  }
  console.log('After prune', db.privateRoutes)
}, 1 /* minute */ * 60 * 1000)

let sodium

// In this spike, I’m hard-coding the public encryption key.
// Normally, we would read it in from the place’s configuration.
// (This spike will eventually be integrated into Place itself.)
console.log(`>${Place.publicKeys.encryption}<`)
const publicEncryptionKey = new X25519PublicKey(Buffer.from(Place.publicKeys.encryption, 'hex'))

export default async (request, response) => {
  // Initialise Sodium Plus if necessary.
  if (!sodium) sodium = await SodiumPlus.auto()

  // Generate a new private path fragment. This is the
  // hexadecimal representation of a 32-byte random buffer.
  const randomBuffer = await sodium.randombytes_buf(32)
  const unecryptedPrivateSocketPathFragment = randomBuffer.toString('hex')

  console.log('Unencrypted secret path', unecryptedPrivateSocketPathFragment)

  // Add the unencrypted secret path, along with the current time, to the routes
  // so we can listen for requests on it.
  if (!db.privateRoutes) {
    db.privateRoutes = []
  }
  db.privateRoutes.push({ createdAt: Date.now(), accessedAt: Date.now(), route: unecryptedPrivateSocketPathFragment })

  console.log('Private routes', db.privateRoutes)

  // Next, we encrypt it using the person’s public encryption key.
  // Since this is over a TLS connection, we don’t need to prove our
  // identity so a sealed box will suffice.
  const encryptedPrivateSocketPathFragment = (await sodium.crypto_box_seal(unecryptedPrivateSocketPathFragment, publicEncryptionKey)).toString('hex')

  console.log('Encrypted secret path', encryptedPrivateSocketPathFragment)

  response.json({
    encryptedPrivateSocketPathFragment
  })
}
