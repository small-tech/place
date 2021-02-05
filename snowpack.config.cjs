// import process from 'process'
// import path from 'path'

// const __dirname = new URL('.', import.meta.url).pathname

const process = require('process')
const path = require('path')

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    /* ... */
  },
  exclude: ['.git/**', '*sodiumnative*'],
  plugins: [
    ['@snowpack/plugin-svelte', {
      input: ['.interface', '.svelte']
    }],
  ],
  packageOptions: {
    resolvePaths: [__dirname],
    polyfillNode: true,
    rollup: {
      plugins: [
        {
          name: 'place.small-web.org:inject-svelte',
          resolveId(id) {
            // console.log('resolving id', id)
            const svelteBasePath = path.join(__dirname, 'node_modules', 'svelte')
            const sveltePath = path.join(svelteBasePath, 'index.mjs')
            const svelteInternalPath = path.join(svelteBasePath, 'internal', 'index.mjs')
            switch (id) {
              case 'svelte':
                return sveltePath
              case 'svelte/internal':
                return svelteInternalPath
              default:
                return null
            }
          }
        }
      ]
    }
  },
  devOptions: {
    output: 'stream', // Don’t clear terminal.
    open: 'none',
    secure: true,
    port: 444,
  },
  buildOptions: {
    /* ... */
  },
  optimize: {
    bundle: true,
    minify: true,
    target: 'es2018',
  },
}
