var seaport = require('seaport')
  , EventEmitter = require('events').EventEmitter
  , Hapi = require('hapi')
  , Client = require('../client/Client')
  , pkg = require('../../package.json')
  , util = require('util')
  , createKeys = require('rsa-json')
  ;

var Server = module.exports = function (opts) {
  if (typeof opts !== 'object') opts = {};
  var self = this;

  this.PORT = opts.port || 5001;
  this.HOST = opts.host || '0.0.0.0';
  this.API_PORT = opts.apiport || 9000;
  this.API_HOST = opts.apihost || '0.0.0.0';
  this.PEER_PORT = opts.peerport || undefined;
  this.PEER_HOST = opts.peerhost || undefined;
  this.HEARTBEAT_INTERVAL = 10000;

  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  var serverKeypair;
  var seaportOpts = { heartbeatInterval: this.HEARTBEAT_INTERVAL };

  //array of public keys
  if (opts.authorizedKeys) {
    seaportOpts.authorized = opts.authorizedKeys;
    serverKeypair = createKeys.native();
    seaportOpts.authorized.push(serverKeypair.public);
    seaportOpts.public = serverKeypair.public;
    seaportOpts.private = serverKeypair.private;
  }

  this.seaport = seaport.createServer(seaportOpts);
  this.seaport.listen(this.PORT);
  this.apiServer = Hapi.createServer(this.API_HOST, this.API_PORT);
  require('./httpApi')(this);
  this.apiServer.start(function () {
    self.log('info', util.format("Thalassa server listening on %s:%s", self.HOST, self.PORT));
  });

  var serverClientOpts = { port: this.PORT, host: this.HOST };
  if (serverKeypair) serverClientOpts.key = serverKeypair;

  this.client = new Client(serverClientOpts);
  this.client.register(pkg.name, pkg.version, this.PORT);
  this.client.register(pkg.name+'-api', pkg.version, this.API_PORT);
  this.client.connect();

  if (this.PEER_PORT && this.PEER_HOST) {
    this.peer(this.PEER_HOST, this.PEER_PORT);
  }

  this.client.on('register', function (service) { self.log('debug', 'register', service)});
  this.client.on('free', function (service) { self.log('debug', 'free', service)});
};

Server.prototype.close = function() {
  this.seaport.close();
  this.apiServer.stop();
  this.client.disconnect();
};

Server.prototype.peer = function(host, port) {
  this.log('info', util.format('Peering with %s:%s', host, port));
  this.seaport.peer(host, port);
};