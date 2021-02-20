////////////////////////////////////////////////////////////////////////////////
//
// Middleware: Git server.
//
////////////////////////////////////////////////////////////////////////////////

import NodeGitServer from 'node-git-server'

export default function (placePath) {

  const gitServer = new NodeGitServer(placePath, {
    autoCreate: true,
    authenticate: ({type, repo, user}, next) => {
      // console.log('Type', type)
      if (type === 'push' || type === 'fetch') {
        user((accountName, password) => {
          // TODO: Remove hardcoding. Base password on person’s passphrase.
          // console.log('Authenticating:', accountName, password)
          if (accountName === '42' && password === '42') {
            next()
          } else {
            next('wrong password')
          }
        })
      } else {
        next()
      }
    }
  })

  gitServer.on('push', push => {
    console.log(`   🗄️     ❨Place❩ Receiving git push: ${push.repo}/${push.commit} (${push.branch})`)
    push.accept()
  })

  gitServer.on('fetch', fetch => {
    console.log(`   🗄️     ❨Place❩ Serving git fetch: ${fetch.commit}`)
    fetch.accept()
  })

  const gitHandler = gitServer.handle.bind(gitServer)

  // Let the git server handle any calls to /source/…
  return (request, response, next) => {
    if (request.url.startsWith('/source/')) {
      gitHandler(request, response)
    } else {
      next()
    }
  }
}
