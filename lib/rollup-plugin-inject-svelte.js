export function rollupPluginInjectSvelte(): Plugin {
  return {
    name: 'place:inject-svelte',
    resolveId(id) {
      switch (id) {
        case 'svelte':
          return '/home/aral/small-tech/small-web/place/app/node_modules/svelte/index.mjs'
        case 'svelte/internal':
          return '/home/aral/small-tech/small-web/place/app/node_modules/svelte/internal/index.mjs'
        default:
          return null
      }
    }
  };
}
