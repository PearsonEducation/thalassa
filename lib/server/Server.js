var EventEmitter = require('events').EventEmitter
  , Hapi = require('hapi')
  , Client = require('../client/Client')
  , RedisData = require('./RedisData')
  , zmq = require('zmq')
  , ip = require('ip')
  , pkg = require('../../package.json')
  , util = require('util')
  ;

var Server = module.exports = function (opts) {
  if (typeof opts !== 'object') opts = {};
  var self = this;

  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  this.PORT             = opts.port || 5001;
  this.IP               = ip.address();
  this.API_PORT         = opts.apiport || 10000;
  this.REAPER_FREQ  = opts.reaperFreq || 10000;
  this.UPDATE_FREQ  = opts.updateFreq || 10000;

  var me = {
    name:     pkg.name,
    version:  pkg.version,
    host:     self.IP,
    port:     self.API_PORT
  };

  //
  // Register yourself
  //
  this.data = new RedisData(opts);
  setInterval(function () {
    self.data.update(me);
  }, this.UPDATE_FREQ);

  //
  // API server
  //
  this.apiServer = Hapi.createServer(this.API_PORT);
  require('./httpApi')(this);
  this.apiServer.start(function () {
    self.log('info', util.format("Thalassa API HTTP server listening on %s", self.API_PORT));
  });

  //
  // Schedule the Reaper!
  //
  setInterval(function() {
    self.data.runReaper();
  }, this.REAPER_FREQ);

  // var pub = zmq.socket('pub');
  // pub.identity = 'thalassa|' + this.IP + ':' + this.PORT;
  // var socketBind = util.format('tcp://*:%s', this.PORT)

  // self.log('debug', util.format("attempting to bind to %s", socketBind));
  // // async bind kept complaining that the socket was busy !?!?
  // pub.bindSync(socketBind);
  // self.log('info', util.format("Thalassa socket server listening at %s", socketBind));

  // pub.on('connected', console.log.bind(console));
  // console.log(pub)





  // var serverClientOpts = { port: this.PORT, host: this.HOST };
  // if (serverKeypair) serverClientOpts.key = serverKeypair;

  // this.client = new Client(serverClientOpts);
  // this.client.register(pkg.name, pkg.version, this.PORT);
  // this.client.register(pkg.name+'-api', pkg.version, this.API_PORT);
  // this.client.connect();

  // if (this.PEER_PORT && this.PEER_HOST) {
  //   this.peer(this.PEER_HOST, this.PEER_PORT);
  // }

  // this.client.on('register', function (service) { self.log('debug', 'register', service)});
  // this.client.on('free', function (service) { self.log('debug', 'free', service)});
};

