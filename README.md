# ⛺ Place

## A Small Web Protocol Server

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

## Implementation notes / todos

  - Refactored to use ECMAScript Modules (esm) (Tue, Jan 26, 2021).
  - Due to move to esm will require Node 14.x+
  - Will no longer be shipped as a single binary (but the experience of installing it will remain the same). This will free us from our dependence on Nexe and will mean we can easily adopt and support the latest Node.js LTS. Binary builds and related functionality will be removed. Run `node bin/place.js <path to your small web client>` to test.
  - TODO: current authentication implementation is hardcoded to the test domain used in the sign in spike. Generalise/fix.

Note that, unlike the generic behaviour of Site.js, the server routes of Place are hardcoded and only serve the small web protocols. You can create the client for a small web place using any tools you like as long as they output to a static single-page app (SPA) that conforms to the small web protocols.

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
  - `/hostname`: (GET) returns the production hostname of the small web place being served (i.e., if the server is running on localhost during development but the production hostname is `aral.small-web.org`, the latter is what will be returned. This is used when, for example, (re)generating keys from the passphrase on small web clients as the Blake2b hash of the production hostname is used as the crypographic salt).
  - `/private-token`: (GET) returns a private token (“Bernstein token”) – a cryptographically random 32-byte value that is encrypted with the person’s public X25519 encryption key. (TODO: Rename route to private-token in implementation; currently is private-socket).
  - `/private/:token`: (WSS) a secyre web socket route for exchange of private data between server and client. `:token` is a random 32-byte value as returned from the `/private-token` route (the person MUST decrypt the encrypted Bernstein token returned in order to successfully authenticate and connect to the private websocket route within a specified timeout period – currently 60 seconds in the implementation).


#### Client

  - `/#/private`: the section of a place accessible only to the owner (the person who holds the private key).

Note: The small web protocols are evolving here, alongside the Place (the reference small web protocol server), and will eventually be moved out to [their own repository](https://source.small-tech.org/small-web/protocols).

## Creating a new place

__NOTE: These instructions/process is outdated. New instructions will be added once a new process has been created.__

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
