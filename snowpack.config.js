const process = require('process')
const path = require('path')
const { Stream } = require('stream')

console.log(process.cwd())
console.log(`${path.relative(process.cwd(), __dirname)}/node_modules/svelte/index.mjs`)
console.log(require('fs').readFileSync(`${path.relative(process.cwd(), __dirname)}/node_modules/svelte/index.mjs`, 'utf-8'))
// process.exit()

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    /* ... */
  },
  plugins: [
    /* ... */
    ['@snowpack/plugin-svelte', {
      input: ['.interface', '.svelte']
    }],
  ],
  packageOptions: {
    /* ... */
    polyfillNode: true,
    // knownEntrypoints: ['svelte', 'svelte/internal']
  },
  devOptions: {
    /* ... */
    output: 'stream', // Don’t clear terminal.
    open: 'none',
    secure: true,
    port: 444,
  },
  buildOptions: {
    /* ... */
  },
}
