var Thalassa = require('..')
  , request = require('request')
  ;

var log  = require('../lib/defaultLogger')('debug');

//
// Create a server
//
var server = new Thalassa.Server({
  port: 4444,
  apiport: 4445,
  host: 'localhost',
  log: log
});

//
// Create a client
//
var client = new Thalassa.Client({
  port: 4444,
  apiport: 4445,
  host: 'localhost',
  log: log
});

//
// Register a callback to handle the online notifications of the 
// services we'll subscribe to
//
client.once('online', function (registration) {
  console.log('----- via socket ---------------------');
  console.log(registration);
  console.log('--------------------------------------');
});

//
// Subscribe to the app and version to be notified of online and offline events.
// If you don't pass any arguments you'll be notified for all services, if only
// the app name then you'll be notified regardless of version.
//
client.subscribe('myapp', '1.0.0');

//
// Register our service and start the client so that it will beginning notifying
// the Thalassa server periodically, reupdating our subscription.
//
client.register('myapp', '1.0.0', 8080);
client.start();


//
// Wait a second and then query to make suer our registration exists, via the HTTP
// API and through the client (which also used the HTTP api)
//
setTimeout(function() {
  //
  // look up via http
  //
  request({
      uri: 'http://localhost:4445/registrations/myapp/1.0.0', 
      json: true
    }, function (error, resp, body) {
      console.log('----- via http -----------------------');
      console.log(body);
      console.log('--------------------------------------');
    });

  //
  // look up via client (via http)
  //
  client.getRegistrations('myapp', '1.0.0', function (err, registrations) {
    console.log('----- via client ---------------------');
    console.log(registrations);
    console.log('--------------------------------------');

    //
    // For the sake of this example, close out the client and server so the process
    // will shutdown cleanly
    //
    server.close();
    client.close();
  });

}, 1000);


