export default function (socket, request) {
  console.log('Private socket connection request. Token = ', request.params.token)

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
    socket.close()
  } else {
    // TODO: add client to room, etc., etc.
    console.log('Sending private message')
    socket.send('Hello from the server :) Welcome to the private area! Oooh!!!!')
  }
}
