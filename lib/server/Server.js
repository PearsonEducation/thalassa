var seaport = require('seaport')
  , EventEmitter = require('events').EventEmitter
  , Hapi = require('hapi')
  , Client = require('../client/Client')
  , pkg = require('../../package.json')
  ;

var Server = module.exports = function (opts) {
  if (typeof opts !== 'object') opts = {};

  this.PORT = opts.port || 5001;
  this.HOST = opts.host || '0.0.0.0';
  this.API_PORT = opts.apiport || 9000;
  this.API_HOST = opts.apihost || '0.0.0.0';
  this.PEER_PORT = opts.peerport || undefined;
  this.PEER_HOST = opts.peerhost || undefined;
  this.HEARTBEAT_INTERVAL = 10000;

  this.seaport = seaport.createServer({ heartbeatInterval: this.HEARTBEAT_INTERVAL });
  this.seaport.listen(this.PORT);

  this.apiServer = Hapi.createServer(this.API_HOST, this.API_PORT);
  require('./httpApi')(this);
  this.apiServer.start();

  this.seaportClient = new Client({ port: this.PORT, host: this.HOST });
  this.seaportClient.register(pkg.name, pkg.version, this.PORT);
  this.seaportClient.register(pkg.name+'-api', pkg.version, this.API_PORT);
  this.seaportClient.connect();

  if (this.PEER_PORT && this.PEER_HOST) {
    this.peer(this.PEER_HOST, this.PEER_PORT);
  }

};

Server.prototype.close = function() {
  this.seaport.close();
  this.apiServer.stop();
  this.seaportClient.disconnect();
};

Server.prototype.peer = function(host, port) {
  //console.log('Peering with %s:%s', host, port)
  this.seaport.peer(host, port);
};