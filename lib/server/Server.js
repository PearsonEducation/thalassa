var EventEmitter = require('events').EventEmitter
  , Hapi = require('hapi')
  , Client = require('../client/Client')
  , RedisData = require('./RedisData')
  , axon = require('axon')
  , pub = axon.socket('pub')
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
  this.API_PORT         = opts.apiport || 9000;
  this.REAPER_FREQ  = opts.reaperFreq || 2000;
  this.UPDATE_FREQ  = opts.updateFreq || 10000;

  var me = {
    name:     pkg.name,
    version:  pkg.version,
    host:     self.IP,
    port:     self.API_PORT,
    meta: {
      hostname: require('os').hostname
    }
  };

  //
  // Register yourself
  //
  this.data = new RedisData(opts);
  self.data.update(me);
  this._updateInterval = setInterval(function () {
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

  //
  // Setup Publisher Socket
  //
  //pub.identity = 'thalassa|' + this.IP + ':' + this.PORT;
  pub.set('identity', 'thalassa|' + this.IP + ':' + this.PORT);

  self.log('debug', util.format("attempting to bind to %s", this.PORT));

  pub.bind(this.PORT);
  self.log('info', util.format("Thalassa socket server listening at %s", this.PORT));

  this.data.on('online', onOnline);
  this.data.on('offline', onOffline);

  //
  // At startup, publish `online` for all existing registrations.
  // Do this before the reaper interval runs the first time. By then hopefully clients
  // will have had the opportunity to check back in if Thalassa was down and no other
  // Thalassa server was running, reaping and serving check ins
  //
  self.log('debug', util.format("Publishing 'online' for all known registrations", this.port));
  this.data.getRegistrations(function (err, regs) {
    if (err) {
      // this is not good, error, exit the process and better luck next time
      self.log('error', 'getRegistrations failed on initialization, exiting process', err);
      return process.exit(1);
    }
    regs.forEach(function (reg) {
      onOnline(reg);
    });
  });

  function onOnline (reg) {
    self.log('debug', 'socket published ', [reg.id, 'online', reg]);
    pub.send(reg.id, 'online', reg.stringify());
  }

  function onOffline(regId) {
    self.log('debug', 'socket published ', [regId, 'offline']);
    pub.send(regId, 'offline');
  }

  this.close = function () {
    this.apiServer.stop();
    clearInterval(this._updateInterval);
    this.data.redisClient.end();
  };
};

