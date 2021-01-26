import ansi from 'ansi-escape-sequences'

// Format ansi strings.
// Courtesy Bankai (https://github.com/choojs/bankai/blob/master/bin.js#L142)
function clr (text, style) {
  return process.stdout.isTTY ? ansi.format(text, style) : text
}

export default clr
