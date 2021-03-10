import hostname from './hostname.js'
import keys from './keys.js'
import privateSocket from './private-socket.js'
import test500Error from './test-500-error.js'

export const httpsRoutes = {
  '/hostname': hostname,
  '/keys': keys,
  '/private-socket': privateSocket,
  '/test-500-error': test500Error
}
