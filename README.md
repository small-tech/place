# ⛺ Place

## A tool for building your own Small Web place.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                            WARNING                           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Place is pre-release and rapidly evolving. Things may be un- ┃
┃ implemented, incomplete or broken. Please feel free to play  ┃
┃ but we’re not currently looking for contributions or issues. ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

Place is a hard fork of [Site.js](https://sitejs.org).

## Notes

  - Binary builds are currently broken. Run `node bin/place` to test.
  - Basic Snowpack support added. (Fri, Jan 15, 2021)
  - Basic Svelte support added. (Fri, Jan 15, 2021)
  - FIXME: TLS support for the Snowpack server currently requires that you copy the public and private TLS keys to the directory of the place you’re serving. [Opened discussion here](https://github.com/snowpackjs/snowpack/discussions/2325).
  - FIXME: Svelte support currently requires that you install `svelte` and `svelte-hmr` in the place that you’re creating. This seems to be an issue with the way plugins are loaded (we’re using the `@snowpack/plugin-svelte`) when Snowpack is [used as middleware](https://www.snowpack.dev/guides/server-side-render#option-2%3A-on-demand-serving-(middleware)). There are two issues to open here:
      1. Module not found when specifying plugins in a custom server. (e.g., with `@snowpack/plugin-svelte`)
      2. If you work around the first issue by passing, e.g., `path.join(__dirname, '@snowpack', 'plugin-svelte')`, the modules required by the plugin itself are not found unless they are installed in the folder you are serving (even if they are installed in the folder that your server is running from).
  - FIXME: Snowpack + plugin-svelte issue: if you use a custom name for svelte files (e.g., `.interface`), imports of Svelte components within Svelte files are not picked up unless you either add them to `packageOptions.knownEntrypoints` or you import them _in the JavaScript file also_. This is not an issue if you use the default `.svelte` extension which leads me to believe that this extension is hardcoded in the plugin. TODO: Open an issue.

    Tracking [in this dicussion](https://github.com/snowpackjs/snowpack/discussions/2327).

## Creating a new place

1. Create a folder with the name of your place’s domain:

    ```
    aral.small-web.org
    ```

2. Run place.

    ```
    place aral.small-web.org
    ```

To server an existing place, just run step 2. (If you’re already in the directory, just run `place`).

## Background

The goal of Site.js was to create a server that could run all our current sites at [Small Technology Foundation](https://small-tech.org) and to thus create a solid base of a self-updating, zero-maintenance, single-tenant web server.

Place jettisons some of the generic web-related functionality (e.g., static site generation via Hugo, etc.) in Site.js and reimagines other features (routing, data exchange, workflows, etc.) to implement a tool specifically for [Small Web](https://small-tech.org/research-and-development) development.

Read: [What is the Small Web?](https://ar.al/2020/08/07/what-is-the-small-web/)

Place is under rapid development with constant breaking changes and is not ready for production use.

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Copyright

&copy; 2019-2021 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).

Let’s Encrypt is a trademark of the Internet Security Research Group (ISRG). All rights reserved. Node.js is a trademark of Joyent, Inc. and is used with its permission. We are not endorsed by or affiliated with Joyent or ISRG.

## License

[AGPL version 3.0 or later.](https://www.gnu.org/licenses/agpl-3.0.en.html)

<!-- Yes, this has to be coded like it’s 1999 for it to work, sadly. -->
<p align='center'>⛺</p>
