import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifySensible from '@fastify/sensible';
import fastifySwagger from '@fastify/swagger';
import Fastify from 'fastify';

import v1 from './v1/v1.js';

const fastify = Fastify({
  logger: false,
});

fastify.register(fastifyCors, {
  maxAge: 86400,
});

fastify.register(fastifyMultipart, { addToBody: true });

fastify.register(fastifySensible);

fastify.get('/', (_, reply) => {
  reply.redirect('/documentation');
});

await fastify.register(fastifySwagger, {
  routePrefix: '/documentation',
  swagger: {
    info: {
      title: 'Generate structural isomers from a molecular formula using MayGen',
      description: ``,
      version: '1.0.0',
    },
    produces: ['application/json'],
  },
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
  exposeRoute: true,
});

v1(fastify);

await fastify.ready();
fastify.swagger();

fastify.listen({ port: 30822, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
