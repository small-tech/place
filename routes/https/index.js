import hostname from './hostname.js'
import keys from './keys.js'
import privateToken from './private-token.js'
import test500Error from './test-500-error.js'

export const httpsRoutes = {
  '/hostname': hostname,
  '/keys': keys,
  '/private-token': privateToken,
  '/test-500-error': test500Error
}
