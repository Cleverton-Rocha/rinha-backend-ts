import Fastify from 'fastify'

import ClientesController from './controllers/ClientesController'

const fastify = Fastify({
  logger: true,
})

fastify.register(ClientesController)

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
