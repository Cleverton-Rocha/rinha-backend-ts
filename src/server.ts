import Fastify from 'fastify'

import ClientesController from './controller/ClientesController'

const fastify = Fastify({
  logger: true,
})

fastify.register(ClientesController)

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
