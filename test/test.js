var assert = require('assert')
  , path = require('path')
  , request = require('request')
  , portfinder = require('portfinder')
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
       ;

     before (function (done) {

       portfinder.getPort(function (err, port) {
         assert.ifError(err);
         PORT = port;
         portfinder.basePort = 9000;
         portfinder.getPort(function (err, port) {
           assert.ifError(err);
           API_PORT = port;
           apiRoot = 'http://' + API_HOST + ':' + API_PORT;
           server = new Server( {
             port: PORT,
             host: HOST,
             apiport: API_PORT,
             apihost: API_HOST,
             reaperFreq: 100
           });
           done();
         });
       });
     });

     after (function () {
       server.close();
     });


     it ('should return all for registrations', function (done) {
       this.timeout(10000);

       //need to wait until it comes up
       setTimeout(function () {
         request({
           uri: apiRoot + '/registrations',
           json: true
         }, function (error, response, body) {
           assert.ifError(error);
           assert.equal(200, response.statusCode);

           var thalassas = body.filter(function (it) { return (it.name === 'thalassa'); });

           assert.equal(1, thalassas.length);
           done();
         });
       }, 100);
     });

     it ('should 404 for unknown route', function (done) {
       this.timeout(5000);

       //need to wait until it comes up
       setTimeout(function () {
         request({
           uri: apiRoot + '/bogus',
           json: true
         }, function (error, response, body) {
           assert.ifError(error);
           assert.equal(404, response.statusCode);
           done();
         });
       }, 100);
     });

     it ('should return registrations by name', function (done) {
       this.timeout(5000);

       //need to wait until it comes up
       setTimeout(function () {
         request({
           uri: apiRoot + '/registrations/thalassa',
           json: true
         }, function (error, response, body) {
           assert.ifError(error);
           assert.equal(200, response.statusCode);

           assert.equal(1, body.length);
           assert.equal('thalassa', body[0].name);
           done();
         });
       }, 100);
     });

     it ('should return registrations by name and version', function (done) {
       this.timeout(5000);
       var version = require('../package.json').version;

       //need to wait until it comes up
       setTimeout(function () {
         request({
           uri: apiRoot + '/registrations/thalassa/'+version,
           json: true
         }, function (error, response, body) {
           assert.ifError(error);
           assert.equal(200, response.statusCode);

           assert.equal(1, body.length);
           assert.equal('thalassa', body[0].name);
           assert.equal(version, body[0].version);
           done();
         });
       }, 100);
     });

     it ('should return nothing for query by unknown name', function (done) {
       this.timeout(5000);

       //need to wait until it comes up
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
       }, 100);
     });
      
     it( 'should register and receive one online event if metadata stays the same', function (done) {
       this.timeout(5000);
       var eventCount = 0;
       var name = 'foobar'
         , version = '1.0.0'
         , host = '10.10.10.10'
         , port = 8411
         , meta = { myMeta: 'foo', myOtherMeta: 1 }
         ;
       var client = new Client({
         host: HOST,
         port: PORT,
         updateFreq: 2000
       });
       client.on('online', function(reg){
        eventCount++; 
        setInterval(function() {
           if(eventCount == 1){
             assert.equal(reg.name,name);
             assert.equal(reg.version,version);
             assert.equal(reg.port, port);
             assert.deepEqual(reg.meta, meta); 
             done();
           }
         },3000);
       });
       client.subscribe(name, version);
       client.register(name, version, port, meta);
       client.start(); 
     });  
   
     it( 'should register, receive an online event, unregister, then receive another online event', function (done) {
       this.timeout(5000);
       var eventCount = 0;
       var offlineRecieved = false;
       var name = 'foobar'
         , version = '1.0.0'
         , host = '10.10.10.10'
         , port = 8411
         , meta = { myMeta: 'foo', myOtherMeta: 1 }
         ;
       var client = new Client({
         host: HOST,
         port: PORT,
         updateFreq: 2000
       });
       client.on('online', function(reg){
        eventCount++;
        if(eventCount == 1){
          assert.equal(reg.name,name);
          assert.equal(reg.version,version);
          assert.equal(reg.port, port);
          assert.deepEqual(reg.meta, meta); 
          client.unregister(name,version,port);
        }
        else if(offlineReceived){
          assert.equal(reg.name,name);
          assert.equal(reg.version,version);
          assert.equal(reg.port, port);
          done();
        }
       });
       client.on('offline', function(reg){
         offlineReceived = true;
       });
       client.subscribe(name, version);
       client.register(name, version, port, meta);
       client.start();
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
       client.start();

       //need to wait until it comes up
       setTimeout(function () {
         request({
           uri: apiRoot + '/registrations/' + name +'/'+version,
           json: true
         }, function (error, response, body) {
           assert.ifError(error);
           assert.equal(200, response.statusCode);

           assert.equal(1, body.length);
           assert.equal(name, body[0].name);
           assert.equal(version, body[0].version);
           assert.equal(port, body[0].port);
           assert.equal(meta.myMeta, body[0].meta.myMeta);
           assert.equal(meta.myOtherMeta, body[0].meta.myOtherMeta);

           //also test get registrations
           client.getRegistrations(name, version, function(err,regs){
             assert.ifError(err);
             assert.equal(regs.length, 1);
             done();
           });
         });
       }, 100);
     });

     it ('should stop and restart properly', function (done) {
       this.timeout(5000);
       var name = 'bar'
         , version = '2.0.0'
         , host = '10.10.10.10'
         , port = 8412
         , secondsToExpire = 1
         ;
       var client = new Client({
         host: HOST,
         port: PORT
       });

       client.register(name, version, port, { secondsToExpire: secondsToExpire});
       setTimeout(function() {
         client.stop();
         setTimeout(function() {
           request({
             uri: apiRoot + '/registrations/' + name +'/'+version,
             json: true
           }, function (error, response, body) {
             assert.ifError(error);
             assert.equal(200, response.statusCode);
             assert.equal(0, body.length);

             client.start();
             setTimeout(function() {
               request({
                 uri: apiRoot + '/registrations/' + name +'/'+version,
                 json: true
               }, function (error, response, body) {
                 assert.ifError(error);
                 assert.equal(200, response.statusCode);

                 assert.equal(1, body.length);
                 assert.equal(name, body[0].name);
                 assert.equal(version, body[0].version);
                 assert.equal(port, body[0].port);
                 done();
               });
             }, 100);
           });
         }, secondsToExpire*1000);
       }, 100);
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
       client.start();

       setTimeout(function() {
         request({
           uri: apiRoot + '/registrations/' + name +'/'+version,
           json: true
         }, function (error, response, body) {
           assert.ifError(error);
           assert.equal(200, response.statusCode);

           assert.equal(1, body.length);
           assert.equal(name, body[0].name);
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
           }, 100);
         });
       }, 100);
     });

  });
});
