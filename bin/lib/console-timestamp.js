// Courtesy: https://github.com/Splurov/rsync-watch/blob/master/lib/console-timestamp.js

function getTime() {
  const date = new Date()
  return `[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}]`
}

function execute() {
  let args = Array.from(arguments)
  let method = args.shift()
  args.unshift(getTime())
  console[method].apply(console, args)
}

const error = execute.bind(null, 'error')
const log = execute.bind(null, 'log')
const info = execute.bind(null, 'info')

export { error, log, info }
