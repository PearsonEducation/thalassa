var Thalassa = require('..')
  , request = require('request')
  ;

var server = new Thalassa.Server({
  port: 4444,
  apiport: 4445,
  host: 'localhost'
});

var client = new Thalassa.Client({
  port: 4444,
  host: 'localhost'
});

client.register('myapp', '1.0.0', 8080);
client.connect();

// look up via http
request({
    uri: 'http://localhost:4445/registrations/myapp/1.0.0', 
    json: true
  }, function (error, resp, body) {
    console.log('----- via http -----------------------');
    console.log(body);
    console.log('--------------------------------------');
  });

// lookup via seaportclient
setTimeout(function() {
  console.log('----- via client ---------------------');
  console.log(client.seaport.query('myapp@1.0.0'));  
  console.log('--------------------------------------');
  process.exit();
}, 2000);
