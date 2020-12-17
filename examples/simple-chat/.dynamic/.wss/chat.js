////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Basic chat app with Place (server).
//
// For a step-by-step tutorial of how to build this example, see:
// https://ar.al/2019/10/10/build-a-simple-chat-app-with-site.js
//
// Copyright ⓒ 2019 Aral Balkan.
// Released under GNU AGPL version 3.0 or later.
//
////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = function (client, request) {
  // New client connection: persist client’s “room”
  // based on request path.
  client.room = this.setRoom(request)

  // Log the connection.
  console.log(`New client connected to ${client.room}`)

  client.on('message', message => {
    // New message received: broadcast it to all other clients
    // in the same room after performing basic validation.
    if (!isValidMessage(JSON.parse(message))) {
      console.log(`Message is invalid; not broadcasting.`)
      return
    }

    const numberOfRecipients = this.broadcast(client, message)

    // Log the number of recipients message was sent to
    // and make sure we pluralise the log message properly.
    console.log(`${client.room} message broadcast to `
      + `${numberOfRecipients} recipient`
      + `${numberOfRecipients === 1 ? '' : 's'}`)
  })
}

// Is the passed object a valid string?
function isValidString(s) {
  return Boolean(s)                // Isn’t null, undefined, '', or 0
    && typeof s === 'string'       // and is the correct type
    && s.replace(/\s/g, '') !== '' // and is not just whitespace.
}

// Is the passed message object valid?
function isValidMessage(m) {
  return isValidString(m.nickname) && isValidString(m.text)
}
