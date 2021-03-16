export default function (client, request) {
  const tokenShort = request.params.token.slice(0,8).toLowerCase()
  console.log(`   🔐️    ❨Place❩ Private socket connection request with token ${tokenShort}`)

  // Set the client’s room to limit private broadcasts to people who are authenticated.
  client.room = this.setRoom({url: '/private'})

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
    client.send('Error: unauthorised.')
    client.close()
  } else {
    // TODO: add client to room, etc., etc.
    console.log(`   🔓️    ❨Place❩ Authorised: token ${tokenShort}`)
    client.send('Hello from the server :) Welcome to the private area! Oooh!!!!')
    this.broadcast(client, `There’s been a new login from ${request._remoteAddress}`)
  }
}
