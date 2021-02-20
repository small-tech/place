////////////////////////////////////////////////////////////////////////////////
//
// Middleware: Error 404.
//
////////////////////////////////////////////////////////////////////////////////

import fs from 'fs-extra'
import path from 'path'

function defaultError (missingPath) {
  return `<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 404: Not found</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">4🤭4</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Could not find</span> <span style="color: grey;">${missingPath}</span></p></main></body></html>`
}

export default function (clientPath) {
  // Load in a custom 404 page, if one exists on the client.
  const customErrorTemplatePath = path.join(clientPath, '404', 'index.html')
  const hasCustomErrorTemplate = fs.existsSync(customErrorTemplatePath)
  let customErrorTemplate = null
  if (hasCustomErrorTemplate) {
    customErrorTemplate = fs.readFileSync(customErrorTemplatePath, 'utf-8')
  }

  return (request, response, next) => {
    if (hasCustomErrorTemplate) {
      // Enable basic template support for including the missing path.
      let customError = customErrorTemplate.replace('THE_PATH', request.path)

      // Enable relative links to work in custom error pages.
      customError = customError.replace('<head>', '<head>\n\t<base href="/404/">')

      response.status(404).send(customError)
    } else {
      // Send default 404 page.
      response.status(404).send(defaultError(request.path))
    }
  }
}
