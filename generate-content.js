import path from 'path'
import snowpack, { build } from 'snowpack'
const __dirname = new URL('.', import.meta.url).pathname

async function generateContent (absolutePathToServe) {

  console.log(`   🎠    ❨Place❩ Building with Snowpack`)

  const snowpackConfigurationFilePath = path.join(__dirname, 'snowpack.config.cjs')
  const snowpackConfiguration = await snowpack.loadConfiguration({}, snowpackConfigurationFilePath)
  snowpackConfiguration.cwd = absolutePathToServe

  const { result } = await build({ config: snowpackConfiguration }) // returns: SnowpackBuildResult
}

export default generateContent

await generateContent('/home/aral/small-tech/small-web/sandbox/sign-in.small-web.org')
