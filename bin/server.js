#!/usr/bin/env node
var optimist = require('optimist')
            .options({
              host: {
                default : '127.0.0.1',
                describe: 'host to bind to'
              },
              port: {
                default : 5001,
                describe: 'port to bind to for axon socket'
              },
              apihost: {
                default : '127.0.0.1',
                describe: 'host to bind to'
              },
              apiport: {
                default : 9000,
                describe: 'port to bind to for http api'
              },
              redisHost: {
                default : '127.0.0.1',
                describe: 'Redis host'
              },
              redisPort: {
                default : 6379,
                describe: 'Redis port'
              },
              redisDatabase: {
                default : 0,
                describe: 'Redis database to select'
              },
              reaperFreq: {
                default : 2000,
                describe: 'Reaper frequency (ms)'
              },
              debug: {
                boolean: true,
                describe: 'enabled debug logging'
              },
              help: {
                alias: 'h'
              }
            });

var argv = optimist.argv;

if (argv.h) {
  optimist.showHelp();
  process.exit(0);
}

argv.log = require('../lib/defaultLogger')( (argv.debug == true) ? 'debug' : 'error' );
var Thalassa = require('..');
var server = new Thalassa.Server(argv);
