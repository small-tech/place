import { getPublicKeys } from '../../lib/public-keys.js'

import nacl from 'tweetnacl'
import sealedBox from 'tweetnacl-sealedbox-js'

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

export default (request, response) => {
  const publicEncryptionKey = Buffer.from(getPublicKeys().encryption, 'hex')

  // Generate a new private path fragment. This is the
  // hexadecimal representation of a 32-byte random buffer.
  const randomBytes = nacl.randomBytes(32)
  const unecryptedPrivateSocketPathFragment = toHex(randomBytes)

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
  const encryptedPrivateSocketPathFragment = toHex(sealedBox.seal(Buffer.from(unecryptedPrivateSocketPathFragment), publicEncryptionKey))

  console.log('Encrypted secret path', encryptedPrivateSocketPathFragment)

  response.json({
    encryptedPrivateSocketPathFragment
  })
}

// Uint8Array to Hex String
// Author: Michael Fabian 'Xaymar' Dirks
// https://blog.xaymar.com/2020/12/08/fastest-uint8array-to-hex-string-conversion-in-javascript/

// Pre-Init
const LUT_HEX_4b = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
const LUT_HEX_8b = new Array(0x100)
for (let n = 0; n < 0x100; n++) {
  LUT_HEX_8b[n] = `${LUT_HEX_4b[(n >>> 4) & 0xF]}${LUT_HEX_4b[n & 0xF]}`
}

// End Pre-Init
function toHex(buffer) {
  let out = ''
  for (let idx = 0, edx = buffer.length; idx < edx; idx++) {
    out += LUT_HEX_8b[buffer[idx]]
  }
  return out
}

// Hex string to Uint8Array
function hexToUInt8Array(string) {
  var bytes = new Uint8Array(Math.ceil(string.length / 2));
  for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(string.substr(i * 2, 2), 16);
  return bytes
}
