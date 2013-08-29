var zmq = require('zmq')
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

  this.PORT         = opts.apiport || 5001;

  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

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
  keySearch += (version) ? util.format('/%s/', version) : '/'
  return keySearch;
};

Client.prototype.socketConnect = function() {
  var self = this;
  if (this.socket === null) {
    this.socket = zmq.socket('sub');
    this.socket.identity = 'thalassa-aqueduct|' + this.IP + ':' + this.PORT;
    var bind = util.format('tcp://%s:%s', this.HOST, this.PORT);
    self.log('info', 'Thalassa:Client.socketConnect: connecting to socket ' + bind);
    this.socket.connect(bind);

    //
    // messages are of the format
    // <id>~state~<stringified registration>
    //

    this.socket.on('message', function (data) {
      var msg = data.toString();
      self.log('debug', 'Thalassa:Client.onMessage: received ' + msg);
      var parts = msg.split('~');

      if (parts.length < 2) {
        // ignore the message
        self.log('info', 'Thalassa:Client.onMessage: ignoring unexpected socket message ' + msg);
        return;
      }

      var regId = parts[0], state = parts[1];

      if (state === 'online') {
        var reg = JSON.parse(parts[2]);
        self.emit('online', reg);
      }
      else if (state === 'offline') {
        self.emit('offline', regId);
      }
      else {
        self.log('info', 'Thalassa:Client.onMessage: ignoring message, unknown state ' + msg);
      }
    });
  }
};
