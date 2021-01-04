# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - In progress

Initial release.

---

_Based on [Site.js](https://sitejs.org) at commit [0be25a5](https://github.com/small-tech/site.js/commit/0be25a59fbe73a11f67d84021be333829ea257f1)._

### Changed

  - Name changed to Place.
  - Web site changed to place.small-web.org.

### Added

  - CORS: default behaviour is to accept all cross-origin requests.

### Ported

  - Fix for incorrect unprivileged home path leading to crash on macOS (https://source.small-tech.org/site.js/app/-/commit/c236e23879e6087594dfa2a54a8a42251acbfc75)
  - Fix for enable command crash on systems without Node.js installed (https://source.small-tech.org/site.js/app/-/commit/160379ef74ea498fee18904ee0ece2bb41759c32)

### Removed

  - Proxy server feature.
  - Integrated Hugo feature.
  - Sync option (only `pull` and `push` are supported in Place).
  - Live sync feature.
  - Archival cascade feature.
  - 404 → 302 feature.
  - Sections in readme and help pertaining to above removals.

_See [Site.js changelog](https://github.com/small-tech/site.js/blob/master/CHANGELOG.md) for earlier (and later), Site.js-specific history._
