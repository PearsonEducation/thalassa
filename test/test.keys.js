var assert = require('assert')
  , path = require('path')
  , request = require('request')
  , portfinder = require('portfinder')
  , createKeys = require('rsa-json')
  , Server = require('..').Server
  , Client = require('..').Client
  ;
  

describe ('Thalassa', function () {

  describe ('api', function () {
    var localhost = '127.0.0.1'
      , PORT = null
      , HOST = localhost
      , API_PORT = null
      , API_HOST = localhost
      , server = null
      , apiRoot = null
      , key = createKeys.native()
      ;

    before (function (done) {

      portfinder.getPort(function (err, port) {
        assert.ifError(err);
        PORT = port;
        portfinder.basePort = 9100;
        portfinder.getPort(function (err, port) {
          assert.ifError(err);
          API_PORT = port;
          apiRoot = 'http://' + API_HOST + ':' + API_PORT;

          server = new Server( {
            port: PORT,
            host: HOST,
            apiport: API_PORT,
            apihost: API_HOST,
            authorizedKeys: [ key.public ]
          });
          done();
        });
      });
    });

    after (function () {
      server.close();
    });

    it ('should use rsa key authorization', function (done) {
      this.timeout(5000);

      var name = 'foo'
        , version = '2.0.0'
        , host = '10.10.10.10'
        , port1 = 8411
        , port2 = 8412
        ;
      var client = new Client({
        host: HOST,
        port: PORT,
        key: key
      });
      client.register(name, version, port1);
      client.connect();

      var untrustedClient = new Client({
        host: HOST,
        port: PORT
      });
      untrustedClient.register(name, version, port2);
      untrustedClient.connect();

      // need to wait until it comes up
      setTimeout(function () {
        request({
          uri: apiRoot + '/registrations',
          json: true
        }, function (error, response, body) {
          assert.ifError(error);
          assert.equal(200, response.statusCode);
          // port authority checks in on itself twice
          assert.equal(3, body.length);
          done();
        });
      }, 1000);
    });

  });
});