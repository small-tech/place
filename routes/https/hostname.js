import Place from '../../index.js'

export default (request, response) => {
  response.json({
    hostname: Place.pathToServe
  })
}
