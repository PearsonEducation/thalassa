var assert = require('assert')
  , path = require('path')
  , request = require('request')
  , portfinder = require('portfinder')
  , Server = require('..').Server
  , Client = require('..').Client
  ;
  

describe ('Harbor Module', function () {

  describe ('api', function () {
    var localhost = '127.0.0.1'
      , PORT = null
      , HOST = localhost
      , API_PORT = null
      , API_HOST = localhost
      , server = null
      ;

    var portAuthority = null
      , portAuthorityPort = 11201
      , apiPort = 9000
      , apiRoot = 'http://' + localhost + ':' + apiPort;

    before (function (done) {

      portfinder.getPort(function (err, port) {
        assert.ifError(err);
        PORT = port;
        portfinder.getPort(function (err, port) {
          assert.ifError(err);
          API_PORT = port;

          server = new Server( {
            port: PORT,
            host: HOST,
            apiPort: API_PORT,
            apiHost: API_HOST
          });
          done();
        });
      });
    });

    after (function () {
      server.close();
    });


    it ('should return all for registrations', function (done) {
      this.timeout(5000);

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/registrations',
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);

          // port authority checks in on itself twice
          assert.equal(2, body.length);
          done();
        });
      }, 50);
    });

    it ('should 404 for unknown route', function (done) {
      this.timeout(5000);

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/bogus',
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(404, response.statusCode);
          done();
        });
      }, 50);
    });

    it ('should return registrations by name', function (done) {
      this.timeout(5000);

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/registrations/thalassa-api',
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);

          assert.equal(1, body.length);
          assert.equal('thalassa-api', body[0].role);
          done();
        });
      }, 50);
    });

    it ('should return registrations by name and version', function (done) {
      this.timeout(5000);
      var version = require('../package.json').version;

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/registrations/thalassa-api/'+version,
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);

          assert.equal(1, body.length);
          assert.equal('thalassa-api', body[0].role);
          assert.equal(version, body[0].version);
          done();
        });
      }, 50);
    });

    it ('should return nothing for query by unknown name', function (done) {
      this.timeout(5000);

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/registrations/bogus',
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);

          assert.equal(0, body.length);
          done();
        });
      }, 50);
    });

    it ('should return search by known term', function (done) {
      this.timeout(5000);

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/search/lass',
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);

          // port authority checks in on itself twice
          assert.equal(2, body.length);
          done();
        });
      }, 50);
    });


    it ('should return nothing for unknown term', function (done) {
      this.timeout(5000);

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/search/zzz',
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);
          assert.equal(0, body.length);
          done();
        });
      }, 500);
    });

    it ('should register and find custom registration', function (done) {
      this.timeout(5000);
      var name = 'foo'
        , version = '2.0.0'
        , host = '10.10.10.10'
        , port = 8411
        , meta = { myMeta: 'foo', myOtherMeta: 1 }
        ;
      var client = new Client({
        host: HOST,
        port: PORT
      });
      client.register(name, version, port, meta);
      client.connect();

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/registrations/' + name +'/'+version,
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);

          assert.equal(1, body.length);
          assert.equal(name, body[0].role);
          assert.equal(version, body[0].version);
          assert.equal(port, body[0].port);
          assert.equal(meta.myMeta, body[0].myMeta);
          assert.equal(meta.myOtherMeta, body[0].myOtherMeta);

          // also test query
          assert.equal(client.query(name, version).length, 1);
          done();
        });
      }, 50);
    });

    it ('should disconnect and reconnect properly', function (done) {
      this.timeout(5000);
      var name = 'bar'
        , version = '2.0.0'
        , host = '10.10.10.10'
        , port = 8412
        ;
      var client = new Client({
        host: HOST,
        port: PORT
      });

      client.register(name, version, port);
      client.connect();

      setTimeout(function() {
        client.disconnect();
        setTimeout(function() {
          request({
            uri: apiRoot + '/registrations/' + name +'/'+version,
            json: true
          }, function (error, response, body) {
            assert.ifError(error);
            assert.equal(200, response.statusCode);

            assert.equal(0, body.length);
            client.connect();
            setTimeout(function() {
              request({
                uri: apiRoot + '/registrations/' + name +'/'+version,
                json: true
              }, function (error, response, body) {
                assert.ifError(error);
                assert.equal(200, response.statusCode);

                assert.equal(1, body.length);
                assert.equal(name, body[0].role);
                assert.equal(version, body[0].version);
                assert.equal(port, body[0].port);
                done();
              });
            }, 20);
          });
        }, 20);
      }, 20);
    });

    it ('should register and unregister properly', function (done) {
      this.timeout(5000);
      var name = 'baz'
        , version = '3.0.0'
        , host = '10.10.10.10'
        , port = 8413
        ;
      var client = new Client({
        host: HOST,
        port: PORT
      });

      client.register(name, version, port);
      client.connect();

      setTimeout(function() {
        request({
          uri: apiRoot + '/registrations/' + name +'/'+version,
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);

          assert.equal(1, body.length);
          assert.equal(name, body[0].role);
          assert.equal(version, body[0].version);
          assert.equal(port, body[0].port);
          client.unregister(name, version, port);
          setTimeout(function() {
            request({
              uri: apiRoot + '/registrations/' + name +'/'+version,
              json: true
            }, function (error, response, body) {
              assert.ifError(error);
              assert.equal(200, response.statusCode);

              assert.equal(0, body.length);
              done();
            });
          }, 20);
        });
      }, 20);
    });

  });
});