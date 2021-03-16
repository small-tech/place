import publicEndpoint from './public.js'
import privateEndpoint from './private.js'

export const wssRoutes = {
  '/public': publicEndpoint,
  '/private/:token': privateEndpoint
}
