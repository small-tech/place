////////////////////////////////////////////////////////////////////////////////
//
// Middleware: domain alias redirects.
//
// Adds domain aliases support (add 302 redirects for any domains
// defined as aliases so that the URL is rewritten). There is always
// at least one alias (the www. subdomain) for global servers.
//
////////////////////////////////////////////////////////////////////////////////

export default function (mainHostname) {
  return (request, response, next) => {
    const requestedHost = request.header('host')
    if (requestedHost === mainHostname) {
      next()
    } else {
      console.log(`   👉    ❨Place❩ Redirecting alias ${requestedHost} to main hostname ${mainHostname}.`)
      response.redirect(`https://${mainHostname}${request.path}`)
    }
  }
}
