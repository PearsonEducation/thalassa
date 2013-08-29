#!/usr/bin/env node

var util = require('util')
  , Thalassa = require('..')
  , optimist = require('optimist')
            .options({
              host: {
                default : '127.0.0.1',
                describe: 'thalassa host'
              },
              port: {
                default : 5001,
                describe: 'socket port'
              },
              apiport: {
                default : 9000,
                describe: 'http api port'
              },
              register: {
                describe: 'name@x.x.x:port,name@x.x.x:port'
              },
              debug: {
                boolean: true,
                describe: 'enabled debug logging'
              },
              showhelp: {
                alias: 'h'
              }
            })
            .demand('register');

var argv = optimist.argv;

if (argv.h) {
  optimist.showHelp();
  process.exit(0);
}

var log = argv.log = require('../lib/defaultLogger')( (argv.debug == true) ? 'debug' : 'error' );

var client = new Thalassa.Client(argv);

// TODO validate format of `register` option
argv.register.split(',').forEach(function (nvp) {
  var parts = nvp.split('@');
  var name = parts[0];
  parts = parts[1].split(':');
  var version = parts[0];
  var port = parts[1];
  client.register(name, version, port);
  log('info', util.format('registering %s@%s on port %s', name, version, port));
})

client.start();