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
                describe: 'thalassa axon socket port'
              },
              apiport: {
                default : 9000,
                describe: 'thalassa http api port'
              },
              register: {
                describe: 'name@x.x.x:port,name@x.x.x:port'
              },
              secsToExpire: {
                default : 10,
                describe: 'default time in seconds for a thalassa registration to be valid'
              },
              updateFreq: {
                default : 5000,
                describe: 'time frequency in ms to ping the thalassa server'
              },
              updateTimeout: {
                default : 2500,
                describe: 'time in ms to wait for a registrion request to respond'
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
  // client.subscribe('thalassa-aqueduct')
  // client.on('online', console.log.bind(console));
  // client.on('offline', console.log.bind(console));
  log('info', util.format('registering %s@%s on port %s', name, version, port));
})

client.start();
