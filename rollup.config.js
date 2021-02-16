import path from 'path'
import resolve from '@rollup/plugin-node-resolve'
import commonJS from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default {
  input: 'index.js',
  output: {
    file: 'dist.js',
    format: 'es',
  },
  plugins: [
    commonJS(),
    resolve(),
    json(),
    {
      name: 'place.small-web.org:inject-svelte',
      resolveId(id) {
        console.log('resolving id', id)
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
