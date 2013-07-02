module.exports = function (server) {

  server.apiServer.route({
    method: 'GET',
    path: '/registrations/{name}/{version}',
    config: {
      handler: function (request, reply) {
        var name = this.params.name;
        var version = this.params.version;
        var role = name + "@" + version;
        reply(server.seaport.query(role));
      }
    }
  });

  server.apiServer.route({
    method: 'GET',
    path: '/registrations/{name}',
    config: {
      handler: function (request, reply) {
        var name = this.params.name;
        reply(server.seaport.query(name));
      }
    }
  });

  server.apiServer.route({
    method: 'GET',
    path: '/registrations',
    config: {
      handler: function (request, reply) {
        reply(server.seaport.query());
      }
    }
  });

  server.apiServer.route({
    method: 'GET',
    path: '/search/{term}',
    config: {
      handler: function (request, reply) {
        var all = server.seaport.query();
        var term = this.params.term;
        var regex = new RegExp(term, 'i');
        reply(all.filter(function (service) {
          return (regex.test(service.role));
        }));
      }
    }
  });

  // server.apiServer.route({
  //   method: 'POST',
  //   path: '/registrations/{name}/{version}/{host}/{port}',
  //   config: {
  //     handler: function (request, reply) {
  //       console.log(request.payload);
  //       var name = this.params.name
  //         , version = this.params.version
  //         , port = this.params.port
  //         , host = this.params.host
  //         , meta = {}
  //         ;

  //       meta.expiresAt = request.payload.expiresAt || undefined;
  //       meta.port = this.params.port;
  //       reply(server.seaportClient.register(name, version, port, meta));

  //     }
  //   }
  // });


};
