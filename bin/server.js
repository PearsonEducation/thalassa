#!/usr/bin/env node
var optimist = require('optimist')
            .options({
              host: {
                default : '127.0.0.1',
                describe: 'host to bind to'
              },
              port: {
                default : 5001,
                describe: 'port to bind to'
              },
              apihost: {
                default : '127.0.0.1',
                describe: 'host to bind to for http api'
              },
              apiport: {
                default : 9000,
                describe: 'port to bind to for http api'
              },
              peerhost: {
                describe: 'optional thalassa host to peer with'
              },
              peerport: {
                describe: 'optional thalassa port to peer with'
              },
              showhelp: {
                alias: 'h'
              }
            });

var argv = optimist.argv;

if (argv.h) {
  optimist.showHelp();
  process.exit(0);
}

var Thalassa = require('..');

var opts = {
  port: argv.port,
  host: argv.host,
  apiport: argv.apiport,
  apihost: argv.apihost
}

if (argv.peerhost && argv.peerport) {
  opts.peerhost = argv.peerhost;
  opts.peerport = argv.peerport;
}
console.log(opts);
var server = new Thalassa.Server(opts);
