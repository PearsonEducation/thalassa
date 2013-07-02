var seaport = require('seaport')
  , os = require('os')
  ;

var Client = module.exports = function (opts) {
  if (typeof opts !== 'object') opts = {};

  this.PORT = opts.port || 5001;
  this.HOST = opts.host || '127.0.0.1';

  this.isConnected = false;
  this.intents = [];
  this.registrations = [];

  var self = this;

  self.seaport = seaport.connect(this.HOST, this.PORT);

  self.seaport.on('register', function (service) {
    // the registration for the service succeeded
    self.registrations.push(service);
  });

  self.seaport.on('free', function (service) {
    // the registration for the service succeeded
    //self.logger.info('Harbor: "free" event, ', service);
    self.registrations = self.registrations.filter(function (reg) {
      return reg.name !== service.role && reg.version !== service.version && reg.port !== service.port;
    });
  });

};

//
// meta { host: <host> }
//
Client.prototype.register = function(name, version, port, meta) {
  var self = this;
  var intent = {
    name: name,
    version: version,
    role: name + '@' + version,
    meta: meta || {}
  };

  intent.meta.port = port;
  intent.meta.hostname = os.hostname();
  intent.meta.pid = process.pid;
  intent.meta.registered = Date.now();

  self.intents.push(intent);

  if (self.isConnected) {
    self.seaport.register(intent.role, intent.meta);
  }
};

Client.prototype.unregister = function(name, version, port) {
  var self = this;
  self.intents = self.intents.filter(function (intent) {
    return intent.name !== name && intent.version !== version && intent.meta.port !== port;
  });
  if (self.isConnected) {
    self.registrations.filter(function (reg) {
      return reg.role === name &&
             reg.version === version &&
             reg.port === port;
    }).forEach(function (reg) {
      self.seaport.free(reg);
    });
  }
};

Client.prototype.connect = function() {
  var self = this;
  if (!self.isConnected) {
    self.isConnected = true;
    self.intents.forEach(function (intent) {
      self.seaport.register(intent.role, intent.meta);
    });
  }
};

Client.prototype.disconnect = function() {
  var self = this;
  self.isConnected = false;
  self.registrations.forEach(function (reg) {
    self.seaport.free(reg);
  });
};

