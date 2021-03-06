# ⛺ Place

## Small Web Protocol Reference Server

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

## Implementation notes / to-dos

  - Refactored to use ECMAScript Modules (esm) (Tue, Jan 26, 2021).
  - Due to move to esm will require Node 14.x+
  - No longer a single binary but a single JS file built using esbuild.
  - Now uses nodemon as a library during dev process to restart the server (instead of chokidar and custom restart logic that didn’t restart the process).

## Working with the development version

To run the development version, simply run the `dev.js` script using Node.

If you want to use the `place <domain>` syntax to launch your server, for the time being, create a script that does this (e.g., place the following in your `/usr/local/bin` folder, substituting the path to `dev.js` for your own machine):

```bash
#!/bin/bash
pushd /path/to/your/working/copy/of/place/ > /dev/null
./dev.js
popd > /dev/null
```

Note that, unlike the generic behaviour of Site.js, the server routes of Place are hardcoded and only serve the small web protocols. You can create the client for a small web place using any tools you like as long as they output to a static single-page app (SPA) that conforms to the small web protocols.

__Place command-line interface. Drafted Feb 18, 2021. Implementation is a work in progress:__

## Syntax

```
place [command] [options]
```

## Commands

__Note: documentation is currently ahead of implementation.__

#### `serve`

_(Default command if no command is specified.)_

Serves a small web place with the client optionally specified by the HTTPS git URL of its distribution repository at the identifying domain optionally identified by the passed domain at the location optionally specified by the passed flag and with the person’s identity supplied by the optional public keys.

```
place [serve] [domain] [--client=https-git-url-of-client] [--at-localhost|--at-hostname] [--public-signing-key=…] [--public-encryption-key=…]
```

If no arguments are specified, runs the place using the settings used on the previous run or starts interactive place creation flow if there was no previous run.

##### Examples:

  - Serve `aral.small-web.org` at `https://localhost:443` with the Small Web Reference Client (Henry):

    ```
    place aral.small-web.org
    ```

    (While developing clients, you can run the client you’re developing on a different port, e.g., 444.)

    _Note: this is equivalent to the more verbose `place aral.small-web.org --at-hostname` or, the even more verbose (full syntax), `place serve aral.small-web.org --at-localhost`_

  - Assuming that the local hostname of your development machine is `dev.ar.al`, serve `aral.small-web.org` from `https://dev.ar.al`:

    ```
    place aral.small-web.org --at-hostname
    ```

    _Note: this is equivalent to the more verbose (full syntax) `place serve aral.small-web.org --at-hostname`_

##### Positional arguments

  - `domain`: _(optional)_ a [fully-qualified domain name](https://en.wikipedia.org/wiki/Fully_qualified_domain_name) (FQDN).

    This is the domain that is used to identify your small web place and where you will ultimately be serving your small web place from publicly.

    e.g., `aral.small-web.org`

    _If `domain` is not specified, the place that was last served is served (or an error is shown if this is the first time `place serve` is run)._

    Note that this does not have to be domain that the place is served from, it is the domain that currently identifies the place. It could, for example, be served from localhost during development or the development machine’s IP address or hostname during testing.

##### Flags (optional)

  - `--client=https-git-url-for-client`: _(optional)_ URL to public https git endpoint for the source code of the distribution build (single page app; SPA) of the small web client you want to run at your place. This is the software that powers your place.

    If provided, Place will clone the repository (if it hasn’t already) and serve the client.

    e.g., If you want to run Meep (currently does not exist) at your place, you would use the URL: `https://aral.small-web.org/source/meep-dist`.

    If not specified, Place defaults to serving the Small Web Refrence Client (Henry).

   - `--at-localhost`: (default) serve the place at `https://localhost`.

     (It will also be automatically served from your local IP so you can hit it from anywhere on your LAN).

     Used during development/testing.

   - `--at-hostname`: serve the place at your local machine’s hostname.

     e.g., if your local development machine’s hostname is `dev.ar.al`, that’s the URL your place will be served from.

     Used for staging/testing.

   - `--public-signing-key=…`: use the public signing key provided as part of the person’s identity (and serve it from `/keys`). If not specified, the previously-set key is used (if no such key exists, the interactive place creation flow is triggered).

      Used by hosts when setting up a place (where the private key material never leaves the web client).

   - `--public-encryption-key=…`: use the public encryption key provided as part of the person’s identity (and serve it from `/keys`). If not specified, the previously-set key is used (if no such key exists, the interactive place creation flow is triggered).

      Used by hosts when setting up a place (where the private key material never leaves the web client).

## Other commands

The following commands generally have the same signatures and behaviour as in [Site.js](https://sitejs.org). More comprehensive documentation to follow.

### Daemon-related

  - `status`
  - `logs`
  - `start`
  - `stop`
  - `restart`
  - `disable`

_TODO: All these need updating to remove the single-binary-distribution-related code branches as they are no longer relevant._

### General

  - `version` _(TODO: needs updating) Note also that the versioning system will vary from Site.js due to not shipping executables in Place and using git tags for updates)._
  - `help` _(TODO: needs updating)_
  - `uninstall` _(TODO: needs updating)_

## Small Web Protocol notes/draft

### General

  - MUST be free and open source (and released under a “share alike” license, e.g., AGPLv3 or later)

  - The client MUST be a single page web app that contains source code only (no data). This is so that we can use out-of-band verification (e.g., a browser extension) to verify that the downloaded web app is what we expect it to be (integrity verification). All other resources included MUST use subresource integrity and any dynamically imported code MUST be signed by a trusted person.

  - The client MUST, on first use, generate with at least 100 bits of entropy a single DiceWare passphrase. From this passphrase it MUST derive via cryptographically secure means all other key material, including the Ed25519 signing keys, the Curve25519 encryption keys, and the SSH keys.

  - The server hosting a Small Web place MUST have the root account disabled, have one account set up for the owner of the server and permit access only via SSH. The server MUST NEVER come into possession of the owner’s private key material. (The server is untrusted.)

### URL conventions

The following URLs are reserved and have special meaning.

#### Server

  - `/keys`: (GET) your public Ed25519 signing key and X25519 encryption key. Together, these keys form the identity of your small web place.

  - `/hostname`: (GET) returns the production hostname of the small web place being served (i.e., if the server is running on localhost during development but the production hostname is `aral.small-web.org`, the latter is what will be returned. This is used when, for example, (re)generating keys from the passphrase on small web clients as the Blake2b hash of the production hostname is used as the cryptographic salt).

  - `/private-token`: (GET) returns a private token (“Bernstein token”) – a cryptographically random 32-byte value that is encrypted with the person’s public X25519 encryption key. (TODO: Rename route to private-token in implementation; currently is private-socket).

  - `/private/:token`: (WSS) a secure web socket route for exchange of private data between server and client. `:token` is a random 32-byte value as returned from the `/private-token` route (the person MUST decrypt the encrypted Bernstein token returned in order to successfully authenticate and connect to the private websocket route within a specified timeout period – currently 60 seconds in the implementation).

#### Client

  - `/#/private`: the section of a place accessible only to the owner (the person who holds the private key).

Note: The small web protocols are evolving here, alongside the Place (the reference small web protocol server), and will eventually be moved out to [their own repository](https://source.small-tech.org/small-web/protocols).

## Creating a new place

__Note: documentation is ahead of implementation.__

### Interactively

  ```
  place <domain>
  ```

Where `<domain>` has not yet been set up on the local machine.

### Non-interactively

Either run `place serve` or `place enable` and pass all necessary configuration arguments.

## Background

The goal of Site.js was to create a server that could run all our current sites at [Small Technology Foundation](https://small-tech.org) and to thus create a solid base of a self-updating, zero-maintenance, single-tenant web server.

Place jettisons some of the generic web-related functionality (e.g., static site generation via Hugo, etc.) in Site.js and focuses on being a [Small Web](https://small-tech.org/research-and-development) Protocol Server.

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
