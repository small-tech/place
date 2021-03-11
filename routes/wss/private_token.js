export default function (socket, request) {
  const tokenShort = request.params.token.slice(0,8)
  console.log(`   🔐️    ❨Place❩ Private socket connection request with token ${tokenShort}`)

  if (!db.privateRoutes) {
    db.privateRoutes = []
  }

  let authorised = false
  db.privateRoutes.forEach(route => {
    if (route.route === request.params.token) {
      authorised = true
      route.accessedAt = Date.now()
    }
  })

  if (!authorised) {
    console.log(`   ⛔️    ❨Place❩ Unauthorised: token ${tokenShort}`)
    socket.close()
  } else {
    // TODO: add client to room, etc., etc.
    console.log(`   🔓️    ❨Place❩ Authorised: token ${tokenShort}`)
    socket.send('Hello from the server :) Welcome to the private area! Oooh!!!!')
  }
}
