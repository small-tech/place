////////////////////////////////////////////////////////////////////////////////
//
// ⛺
//
// Unit tests: CLI.
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////

const test = require('tape')
const cli = require('../bin/lib/cli')

const fs = require('fs')
const path = require('path')

process.env['QUIET'] = true

function loadPath(commandPath) {
  fs.readFileSync(path.resolve(`${commandPath.replace('.', './bin')}.js`))
}

test('[CLI] command parsing', t => {

  var {commandPath, args} = cli.initialise([])
  t.ok(commandPath.includes('serve'), 'Syntax: place → command is serve')
  t.ok(args.positional.length === 0, '… there are no positional arguments')
  t.ok(Object.keys(args.named).length === 0, '… there are no named arguments')
  t.doesNotThrow(() => { loadPath(commandPath) }, '… command exists at specified location')

  var {commandPath, args} = cli.initialise(['test/site'])
  t.ok(commandPath.includes('serve'), 'Syntax: place test/site → command is serve')
  t.ok(args.positional.length === 1, '… there is one positional argument')
  t.strictEqual(args.positional[0], 'test/site', '… the first positional argument is the path to serve')
  t.ok(Object.keys(args.named).length === 0, '… there are no named arguments')

  var {commandPath, args} = cli.initialise(['serve'])
  t.ok(commandPath.includes('serve'), 'Syntax: place serve → command is serve')
  t.ok(args.positional.length === 0, '… there are no positional arguments')
  t.ok(Object.keys(args.named).length === 0, '… there are no named arguments')

  var {commandPath, args} = cli.initialise(['serve', 'test/site'])
  t.ok(commandPath.includes('serve'), 'Syntax: place serve test/site → command is serve')
  t.ok(args.positional.length === 1, '… there is one positional argument')
  t.strictEqual(args.positional[0], 'test/site', '… the first positional argument is the path to serve')
  t.ok(Object.keys(args.named).length === 0, '… there are no named arguments')

  var {commandPath, args} = cli.initialise(['version'])
  t.ok(commandPath.includes('version'), 'Syntax: place version → command is version')
  t.doesNotThrow(() => { loadPath(commandPath) }, '… command exists at specified location')

  var {commandPath, args} = cli.initialise(['--version'])
  t.ok(commandPath.includes('version'), 'Syntax: place --version → command is version')

  var {commandPath, args} = cli.initialise(['-v'])
  t.ok(commandPath.includes('version'), 'Syntax: place -v → command is version')

  var {commandPath, args} = cli.initialise(['help'])
  t.ok(commandPath.includes('help'), 'Syntax: place help → command is help')
  t.doesNotThrow(() => { loadPath(commandPath) }, '… command exists at specified location')

  var {commandPath, args} = cli.initialise(['uninstall'])
  t.ok(commandPath.includes('uninstall'), 'Syntax: place uninstall → command is uninstall')
  t.doesNotThrow(() => { loadPath(commandPath) }, '… command exists at specified location')

  var {commandPath, args} = cli.initialise(['enable'])
  t.ok(commandPath.includes('enable'), 'Syntax: place enable → command is enable')
  t.doesNotThrow(() => { loadPath(commandPath) }, '… command exists at specified location')

  var {commandPath, args} = cli.initialise(['enable', 'test/site'])
  t.ok(commandPath.includes('enable'), 'Syntax: place enable test/site → command is enable')
  t.ok(args.positional.length === 1, '… there is one positional argument')
  t.strictEqual(args.positional[0], 'test/site', '… the first positional argument is the path to serve')

  var {commandPath, args} = cli.initialise(['disable'])
  t.ok(commandPath.includes('disable'), 'Syntax: place disable → command is disable')
  t.doesNotThrow(() => { loadPath(commandPath) }, '… command exists at specified location')

  var {commandPath, args} = cli.initialise(['logs'])
  t.ok(commandPath.includes('logs'), 'Syntax: place logs → command is logs')
  t.doesNotThrow(() => { loadPath(commandPath) }, '… command exists at specified location')

  var {commandPath, args} = cli.initialise(['status'])
  t.ok(commandPath.includes('status'), 'Syntax: place status → command is status')
  t.doesNotThrow(() => { loadPath(commandPath) }, '… command exists at specified location')

  t.end()
})
