var assert = require('assert')
  , util = require('util')
  ;

module.exports = {

  create: function createRegistration (reg) {
    assert.equal(typeof reg, 'object', 'reg must be an object');
    return new Registration(reg);
  },

  parse: function parseRegistration (stringifiedReg) {
    assert.equal(typeof stringifiedReg,'string', 'stringifiedReg must be a string');
    var reg = JSON.parse(stringifiedReg);
    return new Registration(reg);
  },

  isRegistrationId: function isRegistrationId (id) {
    return (/\/.+\/.+\/.+\/.+/).test(id);
  }
};


function Registration (reg) {

  this.name = String(reg.name);
  this.version = String(reg.version);
  this.host = String(reg.host);
  this.port = parseInt(reg.port, 10);
  this.lastKnown = reg.lastKnown || Date.now();
  this.meta = reg.meta || {};
  this.id = util.format('/%s/%s/%s/%s', this.name, this.version, this.host, this.port);

  // ensure every registration has a hostname
  if (!this.meta.hostname) {
    this.meta.hostname = this.host;
  }

  this.stringify = function () {
    return JSON.stringify(this);
  };
}