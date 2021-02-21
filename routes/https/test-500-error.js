// A simple route that just throws a 500 error.
// Useful when testing.

export default (request, response) => {
  throw new Error('Bad things have happened.')
}
