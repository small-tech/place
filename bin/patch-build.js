import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

const build = path.join(__dirname, '..', 'place.js')
const unpatchedBuild = fs.readFileSync(build, 'utf-8')
const patchedBuild = unpatchedBuild.replace('#!/usr/bin/env node', '#!/usr/bin/env node\n\nconst require = createRequire(import.meta.url)\n')
fs.writeFileSync(build, patchedBuild, 'utf-8')
