#!/usr/bin/env node

var util = require('util')
  , Thalassa = require('..')
  , optimist = require('optimist')
            .options({
              host: {
                default : '127.0.0.1',
                describe: 'host to bind to'
              },
              port: {
                default : 5001,
                describe: 'port to bind to'
              },
              register: {
                describe: 'name@x.x.x:port,name@x.x.x:port'
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

function log() {
  var msg = util.format.apply(null, Array.prototype.slice.call(arguments));
  console.log(new Date().toISOString(), ' - ', msg)
}

var opts = {
  port: argv.port,
  host: argv.host,
  apiport: argv.apiport,
  apihost: argv.apihost
}


var client = new Thalassa.Client(opts);

// TODO validate format of `register` option
argv.register.split(',').forEach(function (nvp) {
  var parts = nvp.split('@');
  var name = parts[0];
  parts = parts[1].split(':');
  var version = parts[0];
  var port = parts[1];
  client.register(name, version, port);
  log('registering %s@%s on port %s', name, version, port);
})

client.on('connect', function () { log('connected to thalassa server %s:%s', argv.host, argv.port);});
client.on('disconnect', function () { log('disconnected');});
client.on('close', function () { log('close');});
client.on('synced  ', function () { log('synced');});

client.connect();
