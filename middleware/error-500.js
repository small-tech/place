////////////////////////////////////////////////////////////////////////////////
//
// Middleware: Error 500.
//
////////////////////////////////////////////////////////////////////////////////

import fs from 'fs-extra'
import path from 'path'

function defaultError (errorMessage) {
  return `<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 500: Internal Server Error</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">5🔥😱</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Internal Server Error</span><br><br><span style="color: grey;">${errorMessage}</span></p></main></body></html>`
}

export default function (clientPath) {
  // Load in a custom 500 page, if one exists on the client.
  const customErrorTemplatePath = path.join(clientPath, '500', 'index.html')
  const hasCustomErrorTemplate = fs.existsSync(customErrorTemplatePath)
  let customErrorTemplate = null
  if (hasCustomErrorTemplate) {
    customErrorTemplate = fs.readFileSync(customErrorTemplatePath, 'utf-8')
  }

  return (error, request, response, next) => {
    // Strip the Error: prefix from the message.
    const errorMessage = error.toString().replace('Error: ', '')

    // If there is a custom 500 path, serve that. The template variable
    // THE_ERROR, if present on the page, will be replaced with the error description.
    if (hasCustomErrorTemplate) {
      // Enable basic template support for including the error message.
      let customError = customErrorTemplate.replace('THE_ERROR', errorMessage)

      // Enable relative links to work in custom error pages.
      customError = customError.replace('<head>', '<head>\n\t<base href="/500/">')

      response.status(500).send(customError)
    } else {
      // Send default error page.
      response.status(500).send(defaultError(errorMessage))
    }
  }
}