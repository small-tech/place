#!/usr/bin/env node
import cli from './lib/cli.js'

// While testing elevated privileges on Windows, if you are getting
// an error and you do not want the window to close before you can
// see it, temporarily uncomment the following line:
// process.stdin.resume()

try {
  const {commandPath, args} = cli.initialise(process.argv.slice(2))
  ;(await import(commandPath)).default(args)
} catch (error) {
  console.log(error)
  process.exit(1)
}
