////////////////////////////////////////////////////////////////////////////////
//
// Middleware: Response object html() method mixin.
//
// Injects an html() method into the response object as a handy utility
// for both setting the type of the response to HTML and ending it with
// the passed content. Let’s save some keystrokes. Over time, they can
// add up to whole lifetimes.
//
////////////////////////////////////////////////////////////////////////////////

export default function (request, response, next) {
  (() => {
    const self = response
    response.html = content => {
      self.type('html')
      self.end(content)
    }
  })()
  next()
}
