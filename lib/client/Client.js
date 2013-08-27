var zmq = require('zmq')
  , os = require('os')
  , util = require('util')
  , ip = require('ip')
  , request = require('request')
  , registrations = require('../server/registrations')
  , EventEmitter = require('events').EventEmitter
  ;

var Client = module.exports = function (opts) {
  if (typeof opts !== 'object') opts = {};
  EventEmitter.call(this);

  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  this.PORT         = opts.apiport || 10000;
  this.HOST         = opts.host || '127.0.0.1';
  this.UPDATE_FREQ  = opts.updateFreq || 5000;
  this.MODE         = opts.mode || 'http';
  this.MY_IP        = ip.address();

  // var socket = zmq.socket('sub');
  // socket.identity = "its me";
  // socket.connect ('tcp://' + this.HOST + ":" + this.PORT);
  // socket.subscribe('echo');
  // socket.on('message', function (data) {
  //   console.log(socket.identity + ': received data ' + data.toString());
  // });


  this.isOn = false;
  this.intents = [];
  this.registrations = [];
  this.pending = {};
};

util.inherits(Client, EventEmitter);

//
// 
//
Client.prototype.register = function(name, version, port, meta) {
  var self = this;
  var reg = {
    name: name,
    version: version,
    host: self.MY_IP,
    port: port,
    meta: meta || {}
  };

  reg.meta.hostname = os.hostname();
  reg.meta.pid = process.pid;
  reg.meta.registered = Date.now();

  var intent = registrations.create(reg);
  self.intents.push(intent);

  if (self.isOn) {
    self._sendUpdate(intent);
  }
};

Client.prototype.unregister = function(name, version, port) {
  var self = this;
  var reg = registrations.create({
    name: name,
    version: version,
    host: self.MY_IP,
    port: port,
  });

  //
  // filter out the unwanted registration intent
  //
  self.intents = self.intents.filter(function (intent) {
    return reg.id !== intent.id;
  });
};

Client.prototype.on = function() {
  var self = this;
  if (!self.isOn) {
    self.isOn = true;
    self._startUpdateInterval();
  }
};

Client.prototype.off = function() {
  var self = this;
  self.isOn = false;
  clearInterval(self._updateInterval);
  self.registrations.forEach(function (reg) {
    self.seaport.free(reg);
  });
};

// Client.prototype.query = function(role, version) {
//   return this.seaport.query(role + '@' + version);
// };


Client.prototype._startUpdateInterval = function() {
  var self = this;
  self._updateInterval = setInterval(function() {
    self.intents.forEach(self._sendUpdate.bind(self));
  }, self.UPDATE_FREQ);
};

Client.prototype._sendUpdate = function (intent) {
  if (this.MODE === 'http') {
    this._sendHTTPUpdate(intent);
  }
  else {
    this.log('error', 'Client._sendUpdate: unsupported mode ' + this.mode);
  }
};

// TODO batch multiple requests?

Client.prototype._sendHTTPUpdate = function (intent) {
  var self = this;
  var uri = util.format('http://%s:%s/registrations/%s/%s/%s/%s', self.HOST, self.PORT, intent.name, intent.version, intent.host, intent.port);
  self.log('debug', 'Client._sendUpdate uri: ' + uri);

  //
  // If the last call is stil pending, don't add fuel to the fire
  //
  if (self.pending[intent.id]) {
    self.log('error', 'Client._sendHTTPUpdate last call still pending! (skipping): ' + intent.id);
    return ;
  }

  self.pending[intent.id] = true;

  request({
    uri: uri,
    method: 'POST',
    json: intent.meta
  },
  function (error, response, body) {
    self.pending[intent.id] = false;
    if (error) self.log('error', 'Client._sendUpdate', error);
    else self.log('debug', util.format('Client._sendUpdate (%s)', response.statusCode));
  });
};
