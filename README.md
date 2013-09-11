Thalassa
========

Thalassa is a lightweight service registry build primarily on [node.js](http://nodejs.org/), [Redis](http://redis.io/) and [Axon](https://github.com/visionmedia/axon), inspired by [Seaport](https://github.com/substack/seaport). Thalassa is actually a system of components primarily geared to enable continuous deployment scenarios through dynamic configuration of [HAProxy](http://haproxy.1wt.eu/) load balancers and seamless, no connection drop A/B deploys.

This is the central module that includes the server registry and client. The registry uses a ping and expiration type approach. Clients register with the server and pass an optional `secondsToExpire` property telling the server when it is acceptable to expire the registration if the registration is not updated in that time. There is an internal "reaper" function that runs periodically to reap expired registrations. More on that later.

[![NPM](https://nodei.co/npm/thalassa.png)](https://nodei.co/npm/thalassa/)

### History

Thalassa is a second generation system, superseding what was otherwise knows as "Spindrift" inside of [Pearson](http://www.pearson.com/). Spindrift leaned heavily on [@substack](https://github.com/substack)'s Seaport module. Incidentally, Seaport was the original inspiration for the aquatic theme of Spindrift and Thalassa. 

In Greek mythology, Thalassa was the primeval spirit of the sea. In the fables of Aesop, Thalassa appears as a woman formed of sea water rising up from her native element. Thalassa was depicted in Roman-era mosaics as a woman half submerged in the sea, with crab-claw horns, clothed in bands of seaweed, and holding a ship's oar.<sup>[1](http://www.theoi.com/Protogenos/Thalassa.html)</sup>



# Installation

    npm install thalassa
    
or globally
    
    npm install -g thalassa
    
# Running the Server

The Thalassa server and client may be run from the command line or embedded as a module within your application.

## Running from Command Line
    
Assuming Redis is installed and running, start the thalassa server with default options:

    ./node_modules/.bin/thalassa-server --debug
    
or

    thalassa-server --debug

    
### Server Command Line Options

    thalassa-server --help
    Options:
      --host           host to bind to                  [default: "127.0.0.1"]
      --port           port to bind to for axon socket  [default: 5001]
      --apihost        host to bind to                  [default: "127.0.0.1"]
      --apiport        port to bind to for http api     [default: 9000]
      --redisHost      Redis host                       [default: "127.0.0.1"]
      --redisPort      Redis port                       [default: 6379]
      --redisDatabase  Redis database to select         [default: 0]
      --reaperFreq     Reaper frequency (ms)            [default: 2000]
      --debug          enabled debug logging


## Server as an Embedded Module

The same options above (except `debug`) may be passed by properties set in the `opts` object. For example using `new Thalassa.Server(opts)`:

    var Thalassa = require('thalassa');
    
    var server = new Thalassa.Server({
      port: 4444,
      apiport: 4445,
      host: 'localhost'
    });
    
In addition `opts.log` may be optionally set to your own function to handle logging. `opts.log` expects this signature: `function log (level, message, object){}`. `level` will be one of `debug`, `info`, and `error`. `message` is a string and `object` is an optional object with key value pairs. Of `opts.log` is not passed, the module will be quiet.


# Running the Client

The client can be run any of three ways. 

1. From the command-line
2. As a module
3. Over HTTP

## Running Client from Command Line

Why would you do this? Let's say you have an existing legacy Java application that you'd rather not change. You can create a sister service that invokes the command line client to register the service on it's behalf.

For example, if Thalassa is installed globally (other wise `./node_modules/.bin/thalassa-client):

    thalassa-client --register myapp@1.0.0:8080 --debug
    
This registers the application named `my app` at version `1.0.0` that's on the current host on port `8080`. The client will continue to ping the Thalassa server with updates.

### Client Command Line Options

    thalassa-client --help
    Options:
      --host      thalassa host                    [default: "127.0.0.1"]
      --port      thalassa axon socket port        [default: 5001]
      --apiport   thalassa http api port           [default: 9000]
      --register  name@x.x.x:port,name@x.x.x:port  [required]
      --debug     enabled debug logging

## Client as an Embedded Module

Using the client from within a node.js application to register your service is simple. Pass options via the `opts` object like `new Thalassa.Client(opts)`:

    var Thalassa = require('thalassa');
    
    var client = new Thalassa.Client({
      port: 4444,
      apiport: 4445,
      host: 'localhost'
    });
    
    client.register('myapp', '1.0.0', 8080);
    
    // start reporting registrations to the server
    client.start();

    // stop reporting registrations to the server
    client.stop();
    
`opts.log` may be passed just like the server.

### Subscriptions and `online` and `offline` Events

If running as a module, you also have access to `subscribe` to `online` and `offline` events of certain applications. For example:

    client.subscribe('myapp', '1.0.0');
    client.on('online', function (registration) {});
    client.on('offline', function (registration) {});

Alternatively for all versions of `myapp`:

    client.subscribe('myapp');
    
Or every service registration:

    client.subscribe();

### Querying Registrations

Also as a module, you can use the client API to query for registrations. 

    client.getRegistrations('myapp', '1.0.0', function (err, registrations) {
        // registrations is an Array of Registrations
    }
See the HTTP API section for the `Registration` structure.

### Metadata

You can also pass metadata with any registration as a fourth parameter. This can be any javascript object with properties. For example:

    var meta = {
        az: 'use1a',
        size: 'm1.large',
        foo: {
            bar: 'baz'
        }
    };
    client.register('myapp', '1.0.0', 8080, meta)

## HTTP Client 

The Thalassa server exposes a simple HTTP API so it's not necessary to use the `node.js` client and any application that's capable of calling HTTP can participate as an application in the system. See the HTTP API.

# HTTP API

### GET `/registrations/{name}/{version}`
### GET `/registrations/{name}`
### GET `/registrations`

Return `Registrations[]` of all registrations for the optionally provided `name` and `version`. `/registrations` returns everything.


`Registration` is defined in it's own module `thalassa-registrations`. A typical registration looks like this:

    {
        "name": "myapp",
        "version": "1.0.0",
        "host": "192.168.8.106",
        "port": 8080,
        "lastKnown": 1378682020883,
        "meta": {
            "hostname": "mb-mbp.local",
            "pid": 66593,
            "registered": 1378682010864
        },
        "id": "/myapp/1.0.0/192.168.8.106/8080"
    }

All times are in Unix time since epoch form.

The Thalassa client will automatically add `meta.pid` and the server will automatically add `registered` and `hostname` if not provided. If a `hostname` is not provided by the client, the IP will be used instead. Additionally, the Thalassa client will automatically set `hostname` to `require('os').hostname()`.

### POST `/registrations/{name}/{version}/{host}/{port}`

Create or update a registration.

The BODY of the POST should be `application/json` and will be added to `meta`. 

Additionally `meta.secondsToExpire` should be set to explicitly set the expiration time of the registration. In essence you are telling the Thalassa server, if you don't hear back from me in so many seconds, expire my registration and fire an `offline` event. This properly allows the client to tune how often they poll balanced with how long they are willing to accept stale registration data. If you set `secondsToExpire` to `300` then you may poll every ten minutes, but if your service goes down or is underplayed, consumers won't know it for at most `300` seconds. 

### DELETE `/registrations/{name}/{version}/{host}/{port}`

Explicitly delete a registration, causing an `offline` event.

# Known Limitations and Roadmap

Thalassa currently doesn't implement any type of authentication or authorization and at this point expects to be running on a trusted private network. This will be addressed in the future. Ultimately auth should be extensible and customizable. Suggestions and pull requests welcome!

# License

Licensed under Apache 2.0. See [LICENSE](https://github.com/PearsonEducation/thalassa/blob/master/LICENSE) file.
