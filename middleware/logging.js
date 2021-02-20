////////////////////////////////////////////////////////////////////////////////
//
// Middleware: logging.
//
////////////////////////////////////////////////////////////////////////////////

import morgan from 'morgan'
import clr from '../lib/clr.js'

export default function (accessLogDisable, accessLogErrorsOnly) {

  return morgan((tokens, request, response) => {
    const status = tokens.status(request, response) || '?'
    const isError = status.startsWith('4') || status.startsWith('5')

    if (process.env.QUIET || accessLogDisable || (accessLogErrorsOnly && !isError)) {
      return
    }

    let hasWarning = false
    let hasError = false

    let method = tokens.method(request, response)
    if (method === 'GET') method = '↓ GET'
    if (method === 'POST') method = '↑ POST'

    let durationWarning = ''
    let duration = parseFloat(tokens['response-time'](request, response)).toFixed(1)
    if (duration > 500) { durationWarning = ' !'}
    if (duration > 1000) { durationWarning = ' !!'}
    if (durationWarning !== '') {
      hasWarning = true
    }

    duration = `${duration} ms${clr(durationWarning, 'yellow')}`

    if (duration === 'NaN ms') {
      //
      // I’ve only encountered this once (in response to what seems to
      // be a client-side issue with Firefox on Linux possibly related to
      // server-sent events:
      //
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1077089)
      //
      duration = '   -   !'
      hasError = true
    }

    let sizeWarning = ''
    let size = (tokens.res(request, response, 'content-length')/1024).toFixed(1)
    if (size > 500) { sizeWarning = ' !' }
    if (size > 1000) { sizeWarning = ' !!'}
    if (sizeWarning !== '') {
      hasWarning = true
    }

    size = `${size} kb${clr(sizeWarning, 'yellow')}`
    if (size === 'NaN kb') { size = '   -   ' }

    let url = tokens.url(request, response)

    if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.svg') || url.endsWith('.gif')) {
      url = `🌌 ${url}`
    } else if (url.endsWith('.ico')) {
      url = `💠 ${url}`
    }
    else if (url.endsWith('.css')) {
      url = `🎨 ${url}`
    } else if (url.includes('.css?v=')) {
      url = `✨ Live reload (CSS) ${url}`
    } else if (url.endsWith('js')) {
      url = `⚡ ${url}`
    } else {
      url = `📄 ${url}`
    }

    const statusToTextColour = {
      '304': 'cyan',
      '200': 'green',
    }

    let textColour = statusToTextColour[status]
    if (hasWarning) { textColour = 'yellow' }
    if (hasError || isError) { textColour = 'red' }

    const log = [
      clr(method, textColour),
      '\t',
      clr(status, textColour),
      '\t',
      clr(duration, textColour),
      '\t',
      clr(size, textColour),
      '\t',
      clr(url, textColour),
    ].join(' ')

    return `   💞    ${log}`
  })
}
