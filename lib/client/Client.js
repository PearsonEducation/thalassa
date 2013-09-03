var axon = require('axon')
  , os = require('os')
  , util = require('util')
  , ip = require('ip')
  , request = require('request')
  , registrations = require('thalassa-registrations')
  , ThalassaClient  = require('thalassa-http-client')
  , EventEmitter = require('events').EventEmitter
  ;

//
// This client includes ZeroMQ socket capabilities to receive updates
// It sets the thalassa-http-client as it's prototype
//

var Client = module.exports = function (opts) {
  if (typeof opts !== 'object') opts = {};

  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  this.PORT         = opts.port || 5001;
  this.APIPORT      = opts.apiport || 10000;
  this.HOST         = opts.host || '127.0.0.1';
  this.UPDATE_FREQ  = opts.updateFreq || 5000;
  this.MODE         = opts.mode || 'http';
  this.MY_IP        = ip.address();

  this.isOn = false;
  this.intents = [];
  this.registrations = [];
  this.pending = {};

  this.socket = null;

  ThalassaClient.call(opts);
};

util.inherits(Client, ThalassaClient);


Client.prototype.subscribe = function(name, version) {
  if (this.socket === null) this.socketConnect();
  var prefix = this._keySearch(name, version);
  this.log('debug', 'Thalassa:Client.subscribe ' + prefix);
  this.socket.subscribe(prefix);
};

Client.prototype.unsubscribe = function(name, version) {
  if (this.socket === null) this.socketConnect();
  var prefix = this._keySearch(name, version);
  this.log('info', 'Thalassa:Client.unsubscribe ' + prefix);
  this.socket.unsubscribe(prefix);
};

Client.prototype._keySearch = function(name, version) {
  var keySearch = (name) ? ('/' + name) : '';
  keySearch += (version) ? util.format('/%s/*', version) : '/*';
  return keySearch;
};

Client.prototype.socketConnect = function() {
  var self = this;
  if (this.socket === null) {
    this.socket = axon.socket('sub');
    this.socket.set('identity', this.MY_IP + ':' + this.PORT);
    //var bind = util.format('tcp://%s:%s', this.HOST, this.PORT);
    self.log('info', 'Thalassa:Client.socketConnect: connecting to socket ' + this.HOST + ':' + this.PORT);
    this.socket.connect(this.PORT, this.HOST);

    this.socket.on('message', function (regId, state, reg) {
      regId = regId.toString();
      state = state.toString();

      if (state === 'online') {
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
