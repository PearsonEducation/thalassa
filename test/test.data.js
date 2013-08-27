var assert = require('assert')
  , path = require('path')
  , RedisData = require('../lib/server/RedisData')
  ;


describe ('Data Module', function () {
  describe ('Redis', function () {
    var data = null;

    before(function (done) {
      data = new RedisData({ redisDatabase: 15});
      data._clearDb(done);
    });

    it ('should create and delete registration explicitly', function (done) {
      const EXPECTED_STEPS = 3;
      var steps =[];
      var reg = {
        name: 'foo',
        version: '1.0.0',
        host: '127.0.0.1',
        port: 8080
      };

      var expectedRegId = reg.name + '@' + reg.version + '|' + reg.host + ':' + reg.port;

      data.on('online', function (onlineReg) {
        if (onlineReg.name === reg.name) {
          assert.equal(onlineReg.version, reg.version);
          assert.equal(onlineReg.host, reg.host);
          assert.equal(onlineReg.port, reg.port);
          assert.equal(onlineReg.id, expectedRegId);
          ifDone('onlineEvent');
        }
      });

      data.on('offline', function (regId) {
        if (regId === expectedRegId) {
          ifDone('offlineEvent');
        }
      });

      data.update(reg, function (err) {
        assert.ifError(err);

        data.getRegistrations(reg.name, reg.version, function (err, registrations) {
          assert.ifError(err);
          assert.equal(registrations.length, 1);
          assert.equal(registrations[0].name, reg.name);
          assert.equal(registrations[0].version, reg.version);
          assert.equal(registrations[0].host, reg.host);
          assert.equal(registrations[0].port, reg.port);

          data.del(registrations[0].id, function (err) {
            assert.ifError(err);
            ifDone('delete');
          });
        });
      });

      function ifDone(name) {
        steps.push(name);
        if (steps.length == EXPECTED_STEPS) done();
      }
    });

    it ('should create and delete registration explicitly', function (done) {
      const EXPECTED_STEPS = 2;
      var steps = [];
      var reg = {
        name: 'bar',
        version: '1.0.0',
        host: '127.0.0.1',
        port: 8080
      };

      var expectedRegId = reg.name + '@' + reg.version + '|' + reg.host + ':' + reg.port;

      data.on('offline', function (regId) {
        if (regId === expectedRegId) {
          ifDone('offlineEvent');
        }
      });

      data.update(reg, 1, function (err) {
        assert.ifError(err);

        data.getRegistrations(reg.name, reg.version, function (err, registrations) {
          assert.ifError(err);
          assert.equal(registrations.length, 1);
          assert.equal(registrations[0].name, reg.name);
          assert.equal(registrations[0].version, reg.version);
          assert.equal(registrations[0].host, reg.host);
          assert.equal(registrations[0].port, reg.port);

          setTimeout(function() {
            data.runReaper(function (err, reapedIds) {
              assert.ifError(err);
              assert.equal(reapedIds.length, 1);
              assert.equal(reapedIds[0], expectedRegId);
              ifDone('reaper');
            });
          }, 1100);
        });
      });

      function ifDone(name) {
        steps.push(name);
        if (steps.length == EXPECTED_STEPS) done();
      }
    });
  });
});