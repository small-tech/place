import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

const build = path.join(__dirname, '..', '..', 'dist', 'place.mjs')
const unpatchedBuild = fs.readFileSync(build, 'utf-8')
const patchedBuild = unpatchedBuild.replace('#!/usr/bin/env node\n', '#!/usr/bin/env node\nimport{createRequire}from\'module\';const require=createRequire(import.meta.url);')
fs.writeFileSync(build, patchedBuild, 'utf-8')
