import esbuild from 'esbuild'

import { compile } from 'svelte/compiler'
import path from 'path'
import fs from 'fs'


const sveltePlugin = {
  name: 'svelte',
  setup(build) {

    build.onLoad({ filter: /\.svelte$|\.interface$/ }, async (args) => {

      console.log(args)

      // This converts a message in Svelte's format to esbuild's format
      let convertMessage = ({ message, start, end }) => {
        let location
        if (start && end) {
          let lineText = source.split(/\r\n|\r|\n/g)[start.line - 1]
          let lineEnd = start.line === end.line ? end.column : lineText.length
          location = {
            file: filename,
            line: start.line,
            column: start.column,
            length: lineEnd - start.column,
            lineText,
          }
        }
        return { text: message, location }
      }

      // Load the file from the file system
      let source = await fs.promises.readFile(args.path, 'utf8')
      let filename = path.relative(process.cwd(), args.path)

      console.log(filename)

      // Convert Svelte syntax to JavaScript
      try {
        let { js, warnings } = compile(source, { filename })

        // Fix for older components that exhibit this bug:
        // https://github.com/sveltejs/svelte/issues/3165#issuecomment-699985503
        // As per:
        // https://github.com/evanw/esbuild/issues/630
        js = js.replaceAll('outros2.c.push', 'if (outros2 === undefined) { block.o(local); return }\noutros2.c.push')

        let contents = js.code + `//# sourceMappingURL=` + js.map.toUrl()
        return { contents, warnings: warnings.map(convertMessage) }
      } catch (e) {
        return { errors: [convertMessage(e)] }
      }
    })
  }
}

esbuild.build({
  // absWorkingDir: '/home/aral/small-tech/small-web/sandbox/sign-in.small-web.org',
  entryPoints: ['index.js'],
  bundle: true,
  outdir: 'out',
  plugins: [sveltePlugin],
  platform: 'neutral'
}).catch(() => process.exit(1))
