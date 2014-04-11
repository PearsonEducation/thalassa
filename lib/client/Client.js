var axon = require('axon')
  , os = require('os')
  , util = require('util')
  , ip = require('ip')
  , request = require('request')
  , registrations = require('thalassa-registrations')
  , EventEmitter = require('events').EventEmitter
  ;


/**
 * `Client` constructor
 * @constructor
 *
 * @param {number} [opts.port=5001] - Port number of axon socket port
 * @param {number} [opts.apiport=9000] - Port number of Thalassa HTTP API
 * @param {String} [opts.host=127.0.0.1] - Thalassa host
 * @param {number} [opts.updateFreq=20000] - How often to check into registrations to Thalassa server
 * @param {number} [opts.updateTimeout=2500] - How long to wait for a registrion request to respond
 * @param {String} [opts.mode=http]
 */

var Client = module.exports = function (opts) {
  if (typeof opts !== 'object') opts = {};
  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  EventEmitter.call(this);

  this.APIPORT        = opts.apiport || 9000;
  this.PORT           = opts.port || 5001;
  this.HOST           = opts.host || '127.0.0.1';
  this.UPDATE_FREQ    = opts.updateFreq || 20000;
  this.TIMEOUT        = opts.updateTimeout || 2500;
  this.SEC_TO_EXPIRE  = opts.secsToExpire || 60;
  this.MODE           = opts.mode || 'http';
  this.MY_IP          = ip.address();

  this.isOn = false;
  this.intents = [];
  this.registrations = {};
  this.pending = {};

  this.socket = null;
};

util.inherits(Client, EventEmitter);

/**
 * Create a new registration
 *
 * @param {String} name - Name of the service (preferably require('./package.json').name)
 * @param {String} version - Version of the service (preferably require('./package.json').version)
 * @param {String} port - Port this registration is bound to that clients can call
 * @param {Object} meta - Any additional meta data (key, value) to include
 */

Client.prototype.register = function(name, version, port, meta) {
  var self = this;
  var reg = {
    name: name,
    version: version,
    host: self.MY_IP,
    port: port,
    meta: meta || {}
  };

  if (!reg.meta.hostname) {
    reg.meta.hostname = reg.host;
  }

  if (!reg.meta.secondsToExpire) {
    reg.meta.secondsToExpire = this.SEC_TO_EXPIRE;
  }

  reg.meta.hostname = os.hostname();
  reg.meta.pid = process.pid;
  reg.meta.registered = Date.now();

  var intent = registrations.create(reg);
  self.intents.push(intent);

  if (self.isOn) {
    self._sendUpdate(intent);
  }
};

/**
 * Unregister a previously registered registration
 *
 * @param {String} name - Name of the service (preferably require('./package.json').name)
 * @param {String} version - Version of the service (preferably require('./package.json').version)
 * @param {String} port - Port this registration is bound to that clients can call
 */

Client.prototype.unregister = function(name, version, port) {
  var self = this;
  var host = self.MY_IP;
  var reg = registrations.create({
    name: name,
    version: version,
    host: host,
    port: port,
  });

  //
  // filter out the unwanted registration intent
  //
  self.intents = self.intents.filter(function (intent) {
    return reg.id !== intent.id;
  });

  //
  // explicitely delete the registration so the offline notifications happen immediately
  //
  self.del(name, version, host, port);
};


/**
 * Explicitly delete a registration
 *
 * @param {String} name - Name of the service
 * @param {String} version - Version of the service
 * @param {String} port - Port of the registration
 * @param {String} host - Host (ip) of the registration
 */
Client.prototype.del = function (name, version, host, port, cb) {
  var self = this;
  var uri = util.format('http://%s:%s/registrations/%s/%s/%s/%s', self.HOST, self.APIPORT, name, version, host, port);
  request({
    uri: uri,
    json: true,
    method: 'DELETE'
  },
  function (error, response, body) {
    if (error) self.log('error', 'Thalassa:Client.del', error);
    if (response && response.statusCode !== 200 && response.statusCode !== 404) {
      self.log('error', 'Thalassa:Client.del unexpected response ' + response.statusCode);
      error = new Error("del unexpected response " + response.statusCode);
    }
    if (typeof cb === 'function') cb(error);
  });
};

/**
 * Start polling, periodically checking the registrations into the Thalassa server
 */

Client.prototype.start = function() {
  var self = this;
  if (!self.isOn) {
    self.isOn = true;
    self._startUpdateInterval();
  }
};

/**
 * Stop polling registrations
 */

Client.prototype.stop = function() {
  var self = this;
  self.isOn = false;
  clearInterval(self._updateInterval);
};

/**
 * Close: stop polling, disconnect socket
 */

Client.prototype.close = function() {
  var self = this;
  this.stop();
  if (this.socket) this.socket.close();
};

/**
 * Find all `Registration`s over HTTP for `name` and `version` if provided.
 *
 * @param {String} [name]
 * @param {String} [version]
 * @param {getRegistrationsCallback} cb - Callback cb(error, registrations)
 *
 * @callback getRegistrationsCallback
 * @param {Error} error
 * @param {Registrations[]} registrations
 */

Client.prototype.getRegistrations = function(name, version, cb) {
  var self = this;

  var path;
  if (typeof name === 'function') {
    cb = name;
    path = '/registrations';
  }
  else if (typeof version === 'function') {
    cb = version;
    path = util.format('/registrations/%s', name);
  }
  else if (typeof cb === 'function') {
    path = util.format('/registrations/%s/%s', name, version);
  }

  var uri = util.format('http://%s:%s%s', self.HOST, self.APIPORT, path);

  self.log('debug', 'Thalassa:Client.getRegistrations uri: ' + uri);

  request({
    uri: uri,
    json: true
  },
  function (error, response, body) {
    if (error) self.log('error', 'Thalassa:Client.getRegistrations', error);
    if (response && response.statusCode !== 200 && response.statusCode !== 404) {
      self.log('error', 'Thalassa:Client.getRegistrations unexpected response ' + response.statusCode);
      error = new Error("getRegistrations unexpected response " + response.statusCode);
    }
    if (error) return cb(error);

    var regs = (response.statusCode !== 200) ? [] : body;
    cb(null, regs);
  });
};


//
// Axon socket functions
//


/**
 * Subscribe to `offline` and `online` events over the axon socket. Connects if not
 * already connected.
 *
 * @param {String} [name]
 * @param {String} [version]
 */

 Client.prototype.subscribe = function(name, version) {
  if (this.socket === null) this.socketConnect();
  var prefix = this._keySearch(name, version);
  this.log('debug', 'Thalassa:Client.subscribe ' + prefix);
  this.socket.subscribe(prefix);
};

/**
 * Unsubscribe to `offline` and `online` events over the axon socket. Connects if not
 * already connected.
 *
 * @param {String} [name]
 * @param {String} [version]
 */

Client.prototype.unsubscribe = function(name, version) {
  if (this.socket === null) this.socketConnect();
  var prefix = this._keySearch(name, version);
  this.log('info', 'Thalassa:Client.unsubscribe ' + prefix);
  this.socket.unsubscribe(prefix);
};

/**
 * Connect to the Thalassa Server axon socket if not already connected, typically called
 * the first time `subscribe` is called
 */
Client.prototype.socketConnect = function() {
  var self = this;
  if (this.socket === null) {
    this.socket = axon.socket('sub');
    this.socket.set('identity', this.MY_IP + ':' + this.PORT);
    self.log('info', 'Thalassa:Client.socketConnect: connecting to socket ' + this.HOST + ':' + this.PORT);
    this.socket.connect(this.PORT, this.HOST);

    this.socket.on('message', function (regId, state, reg) {
      regId = regId.toString();
      state = state.toString();

      if (state === 'online') {
        var updatedReg = JSON.parse(reg);
        if(regId in self.registrations){
          //if we already have the registration, and no metadata changed, do nothing
          if(JSON.stringify(updatedReg.meta) === JSON.stringify(self.registrations[regId].meta))
            return;
        }
        self.registrations[regId] = updatedReg;
        self.emit('online', registrations.parse(reg.toString()));
      }
      else if (state === 'offline') {
        self.emit('offline', regId);
      }
      else {
        self.log('info', 'Thalassa:Client.onMessage: ignoring message, unknown state ', arguments.map(function (b) { b.toString(); }));
      }
    });
  }
};

Client.prototype._keySearch = function(name, version) {
  var keySearch = (name) ? ('/' + name) : '';
  keySearch += (version) ? util.format('/%s/*', version) : '/*';
  return keySearch;
};

Client.prototype._startUpdateInterval = function() {
  var self = this;
  update();
  self._updateInterval = setInterval(update, self.UPDATE_FREQ);

  function update () {
    self.intents.forEach(self._sendUpdate.bind(self));
  }
};

Client.prototype._sendUpdate = function (intent) {
  if (this.MODE === 'http') {
    this._sendHTTPUpdate(intent);
  }
  else {
    this.log('error', 'Thalassa:Client._sendUpdate: unsupported mode ' + this.mode);
  }
};


Client.prototype._sendHTTPUpdate = function (intent) {
  // TODO batch multiple requests?
  var self = this;
  var uri = util.format('http://%s:%s/registrations/%s/%s/%s/%s', self.HOST, self.APIPORT, intent.name, intent.version, intent.host, intent.port);
  var startTime = Date.now();

  //
  // If the last call is stil pending, don't add fuel to the fire
  //
  if (self.pending[intent.id]) {
    self.log('error', 'Thalassa:Client._sendHTTPUpdate last call still pending! (skipping): ' + intent.id);
    return ;
  }

  self.pending[intent.id] = true;

  request({
    uri: uri,
    method: 'POST',
    json: intent.meta,
    timeout: self.TIMEOUT
  },
  function (error, response, body) {
    self.pending[intent.id] = false;

    // Check for an unsuccessful response, in case, for example we call the wrong
    // host and it returns a 404, etc.
    if (!error && response.statusCode !== 200) {
      error = new Error(util.format('unexpected response statusCode %s from %s',
                        response.statusCode, uri));
    }

    if (error) {
      self.log('error', 'Thalassa:Client._sendUpdate', error);
      self.emit('updateFailed', error);
    }
    else {
      self.emit('updateSuccessful');
      self.log('debug', util.format('Thalassa:Client._sendUpdate (%s) [%s] %s', response.statusCode, Date.now() - startTime, uri));
    }
  });
};
