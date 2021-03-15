export default function (socket, request) {
  const tokenShort = request.params.token.slice(0,8).toLowerCase()
  console.log(`   🔐️    ❨Place❩ Private socket connection request with token ${tokenShort}`)

  if (!db.privateTokens) {
    db.privateTokens = []
  }

  let authorised = false
  db.privateTokens.forEach(token => {
    if (token.body === request.params.token) {
      authorised = true
      token.accessedAt = Date.now()
    }
  })

  if (!authorised) {
    console.log(`   ⛔️    ❨Place❩ Unauthorised: token ${tokenShort}`)
    socket.send('Error: unauthorised.')
    socket.close()
  } else {
    // TODO: add client to room, etc., etc.
    console.log(`   🔓️    ❨Place❩ Authorised: token ${tokenShort}`)
    socket.send('Hello from the server :) Welcome to the private area! Oooh!!!!')
  }
}
