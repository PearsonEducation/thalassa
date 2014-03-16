var EventEmitter = require('events').EventEmitter
  , Hapi = require('hapi')
  , Client = require('../client/Client')
  , RedisData = require('./RedisData')
  , axon = require('axon')
  , ip = require('ip')
  , pkg = require('../../package.json')
  , util = require('util')
  , stats = require('./stats');
  ;

/**
 * `Server` constructor
 * @constructor
 *
 * @param {number} [opts.port=5001] - Port number of axon socket port
 * @param {number} [opts.apiport=9000] - Port number of Thalassa HTTP API
 * @param {number} [opts.reaperFreq=2000] - How often to run the reaper (ms)
 * @param {number} [opts.updateFreq=30000] - How often to check own registration in
 */

var Server = module.exports = function (opts) {
  var self = this;
  if (typeof opts !== 'object') opts = {};
  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  this.PORT         = opts.port || 5001;
  this.IP           = ip.address();
  this.API_PORT     = opts.apiport || 9000;
  this.REAPER_FREQ  = opts.reaperFreq || 2000;
  this.UPDATE_FREQ  = opts.updateFreq || 30000;

  this.pub = axon.socket('pub');

  var me = {
    name:     pkg.name,
    version:  pkg.version,
    host:     self.IP,
    port:     self.API_PORT,
    meta:     { hostname: require('os').hostname }
  };

  var secondsToExpire = Math.ceil((this.UPDATE_FREQ / 1000) * 2);

  //
  // Connect to Redis, register yourself, and do so regularly
  //
  this.data = new RedisData(opts);
  self.data.update(me, secondsToExpire);
  this._updateInterval = setInterval(function () {
    self.data.update(me, secondsToExpire);
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
  this._reaperInterval = setInterval(function () {
    self.data.runReaper();
  }, this.REAPER_FREQ);

  //
  // Setup Publisher Socket
  //
  self.pub.set('identity', 'thalassa|' + this.IP + ':' + this.PORT);
  self.log('debug', util.format("attempting to bind to %s", this.PORT));
  self.pub.bind(this.PORT);
  this.data.on('online', onOnline);
  this.data.on('offline', onOffline);
  self.log('info', util.format("Thalassa socket server listening at %s", this.PORT));

  //
  // At startup, publish `online` for all existing registrations.
  // Do this before the reaper interval runs the first time. By then hopefully clients
  // will have had the opportunity to check back in if Thalassa was down and no other
  // Thalassa server was running, reaping and serving check ins
  //
  self.log('debug', "Publishing 'online' for all known registrations");
  this.data.getRegistrations(function (err, regs) {
    if (err) {
      // this is not good, error, exit the process and better luck next time
      self.log('error', 'getRegistrations failed on initialization, exiting process', String(err));
      return process.exit(1);
    }
    self.log('debug', regs.length + ' known instances on startup');
    // regs.forEach(function (reg) {
    //   onOnline(reg);
    // });
  });

  function onOnline (reg) {
    self.log('debug', 'socket published ', [reg.id, 'online', reg]);
    self.pub.send(reg.id, 'online', reg.stringify());
  }

  function onOffline(regId) {
    self.log('debug', 'socket published ', [regId, 'offline']);
    self.pub.send(regId, 'offline');
  }

};

/**
 * Cleanup and close out all connection, primarily for testing
 */

Server.prototype.close = function() {
  this.apiServer.stop();
  clearInterval(this._updateInterval);
  clearInterval(this._reaperInterval);
  this.data.redisClient.end();
  this.pub.close();
};
