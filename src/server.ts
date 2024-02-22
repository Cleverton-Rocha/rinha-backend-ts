import Fastify from 'fastify'

import ClientesControllers from './controller/ClienteController'

const fastify = Fastify({
  logger: false,
})

fastify.register(ClientesControllers)

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
