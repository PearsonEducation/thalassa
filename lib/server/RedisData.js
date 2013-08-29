var redis = require("redis")
  , util = require("util")
  , events = require("events")
  , registrations = require('thalassa-registrations')
  ;

const MINUTE = 60*1000;

var RedisData = module.exports = function RedisData (opts) {
  events.EventEmitter.call(this);

  if (!opts) opts = {};  var self = this;

  this.SECONDS_TO_EXPIRE = opts.secondsToExpire || 10;
  this.REGISTRATIONS_SET_KEY = '__thalassa.registrations';

  this.REDIS_HOST = opts.redisHost || '127.0.0.1';
  this.REDIS_PORT = opts.redisPort || 6379;
  this.REDIS_DB = opts.redisRedisDatabase || 0;

  this.redisClient = redis.createClient(this.REDIS_PORT, this.REDIS_HOST);
  this.redisClient.select(this.REDIS_DB);

  this.log = (typeof opts.log === 'function') ? opts.log : noop;

};

util.inherits(RedisData, events.EventEmitter);


RedisData.prototype.update = function update(reg, secondsToExpire, cb) {
  var self = this;
  if (typeof secondsToExpire === 'function' && cb === undefined) {
    cb = secondsToExpire;
    secondsToExpire = self.SECONDS_TO_EXPIRE;
  }
  else if (!secondsToExpire) {
    secondsToExpire = self.SECONDS_TO_EXPIRE;
  }
  cb = callback(cb);

  var registration = new registrations.create(reg);

  var client = this.redisClient;
  var timeToExpire = Date.now() + ((secondsToExpire) * 1000);

  client.multi()
    //
    // set the registration details to a key by id
    // /name/version/host/port
    //
    .set(registration.id, registration.stringify())
    //
    // add the timeToExpire to the registrations sorted set
    //
    .zadd(self.REGISTRATIONS_SET_KEY, timeToExpire, registration.id, function (error, numNew) {
      var changedToOnline = (numNew === 1);
      if (changedToOnline) {
        self.emit('online', registration);
      }
    })
    .exec(function (error, replies) {
      //self.log('debug', 'RedisData.update redis multi replies', replies);
      cb(error);
    });
};


RedisData.prototype.getRegistrations = function getRegistrations(name, version, cb) {
  var keySearch;
  if (typeof name === 'function') {
    cb = name;
    keySearch = '/*';
  }
  else if (typeof version === 'function') {
    cb = version;
    keySearch = util.format('/%s/*', name);
  }
  else if (typeof cb === 'function') {
    keySearch = util.format('/%s/%s/*', name, version);
  }

  cb = callback(cb);
  this._getRegistrations(keySearch, cb);
};

RedisData.prototype._getRegistrations = function getRegistrations(keySearch, cb) {
  var self = this;
  var client = this.redisClient;

  client.keys(keySearch, function (error, ids) {
      if (error) return cb(error);

      if (!ids || ids.length === 0) return cb(null, []);
      var regIds = ids.filter(function (id) { return registrations.isRegistrationId(id); });
      if (regIds.length === 0) return cb(null, []);

      client.mget(ids, function (error, stringifiedRegs) {
        if (error) return cb(error);

        var regs = stringifiedRegs
              .map(function(stringifiedReg) { return registrations.parse(stringifiedReg); });
        cb(null, regs);
      });
  });

};


/*
 * Do a run of the timeout logic... the reaper
 */
RedisData.prototype.runReaper = function runReaper(cb) {
  cb = callback(cb);
  var self = this;
  var client = this.redisClient;

  var reaperScript = "\
local res = redis.call('ZRANGEBYSCORE',KEYS[1], 0, ARGV[1], 'LIMIT', 0, 100 ) \
if #res > 0 then \
   redis.call( 'ZREMRANGEBYRANK', KEYS[1], 0, #res-1 ) \
   return res \
else \
   return false \
end";

  function evalCallback (error, reaped) {
    if (error) self.log('error', error.message || error);
    if (!reaped) reaped = [];

    reaped.forEach(function (regId) {
      self.del(regId);
    });

    if (reaped.length > 0) {
      self.log('debug', 'RedisData.runReaper: reaped ' + reaped.length + ' registrations', reaped);
    }

    cb(error, reaped);
  }


  // the redis client isn't accepting an array of arguments for
  // eval for some reason. This doesn't look as nice, but works
  client.EVAL.apply(client, [reaperScript, 1, self.REGISTRATIONS_SET_KEY, Date.now(), evalCallback]);
};

RedisData.prototype.del = function del(regId, cb) {
  cb = callback(cb);
  var self = this;
  var client = this.redisClient;
  client.multi()
  .del(regId)
  .zrem(this.REGISTRATIONS_SET_KEY, regId)
  .exec(function (error, replies) {
    self.emit('offline', regId);
    cb(error);
  });

};

RedisData.prototype._clearDb = function _clearDb(cb) {
  this.redisClient.flushdb(callback(cb));
};

function callback(cb) {
  return (typeof cb === 'function') ? cb : noop;
}

function noop() {
}
