var registrations = require('thalassa-registrations')
  ;

module.exports = function (server) {

  server.apiServer.route({
    method: 'GET',
    path: '/registrations/{name}/{version}',
    config: {
      handler: function (request, reply) {
        var name = this.params.name;
        var version = this.params.version;
        server.data.getRegistrations(name, version, function (err, registrations) {
          reply(registrations);
        });
      }
    }
  });

  server.apiServer.route({
    method: 'GET',
    path: '/registrations/{name}',
    config: {
      handler: function (request, reply) {
        var name = this.params.name;
        server.data.getRegistrations(name, function (err, registrations) {
          reply(registrations);
        });
      }
    }
  });

  server.apiServer.route({
    method: 'GET',
    path: '/registrations',
    config: {
      handler: function (request, reply) {
        server.data.getRegistrations(function (err, registrations) {
          reply(registrations);
        });
      }
    }
  });

  // server.apiServer.route({
  //   method: 'GET',
  //   path: '/search/{term}',
  //   config: {
  //     handler: function (request, reply) {
  //       var all = server.seaport.query();
  //       var term = this.params.term;
  //       var regex = new RegExp(term, 'i');
  //       reply(all.filter(function (service) {
  //         return (regex.test(service.role));
  //       }));
  //     }
  //   }
  // });

  server.apiServer.route({
    method: 'POST',
    path: '/registrations/{name}/{version}/{host}/{port}',
    config: {
      handler: function (request, reply) {
        var reg = {
          name: this.params.name,
          version: this.params.version,
          host: this.params.host,
          port: this.params.port,
          meta: request.payload || {}
        };

        server.data.update(reg, reg.meta.secondsToExpire, function (err) {
          if (err) reply(err);
          else reply(200);
        });
      }
    }
  });

  server.apiServer.route({
    method: 'DELETE',
    path: '/registrations/{name}/{version}/{host}/{port}',
    config: {
      handler: function (request, reply) {
        var reg = {
          name: this.params.name,
          version: this.params.version,
          host: this.params.host,
          port: this.params.port
        };

        var regId = registrations.create(reg).id;

        server.data.del(regId, function (err) {
          if (err) reply(err);
          else reply(200);
        });
      }
    }
  });


};
