export default function (client, request) {
  const remoteAddress = request._remoteAddress
  console.log(`   🔐️    ❨Place❩ Public socket connection request from ${remoteAddress}`)

  // Set the client’s room to limit private broadcasts to people who are authenticated.
  client.room = this.setRoom({url: '/public'})

  // TODO: add client to room, etc., etc.
  client.send(`${new Date()}: [Place] A public welcome.`)
  this.broadcast(client, `There’s been a new public connection from ${remoteAddress}`)
}
