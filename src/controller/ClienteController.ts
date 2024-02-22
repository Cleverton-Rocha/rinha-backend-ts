import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { BodyType, ParamsType } from '../utils/types'

const prisma = new PrismaClient()

const bodySchema = z.object({
  valor: z.number().int().positive(),
  tipo: z.enum(['c', 'd']),
  descricao: z.string().min(1).max(10),
})

const paramsSchema = z.object({
  id: z.number({ coerce: true }),
})

async function ClientesController(fastify: FastifyInstance) {
  fastify.get(
    '/clientes/:id/extrato',
    async (
      request: FastifyRequest<{ Params: ParamsType }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = paramsSchema.parse(request.params)

        const cliente = await prisma.cliente.findUnique({
          where: {
            id: id,
          },
          include: {
            transacao: {
              take: 10,
              orderBy: {
                realizada_em: 'desc',
              },
            },
          },
        })

        if (!cliente) {
          return reply.status(404).send()
        }

        const lastTransactions = cliente.transacao.map((transaction) => ({
          valor: transaction.valor,
          tipo: transaction.tipo,
          descricao: transaction.descricao,
          realizada_em: transaction.realizada_em,
        }))

        return reply.send({
          saldo: {
            total: cliente.saldo,
            data_extrato: new Date().toISOString(),
            limite: cliente.limite,
          },
          ultimas_transacoes: lastTransactions,
        })
      } catch (err) {
        console.error(err)

        return reply.status(400).send()
      }
    },
  )

  fastify.post(
    '/clientes/:id/transacoes',
    async (
      request: FastifyRequest<{ Params: ParamsType; Body: BodyType }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = paramsSchema.parse(request.params)
        if (id < 1 && id > 5) {
          return reply.status(404).send()
        }

        const validarBody = bodySchema.safeParse(request.body)
        if (!validarBody.success) {
          return reply.status(422).send()
        }

        const { valor, descricao, tipo } = validarBody.data

        const cliente = await prisma.cliente.findUnique({
          where: {
            id: id,
          },
        })

        if (!cliente) {
          return reply.status(404).send()
        }

        if (tipo === 'c') {
          const novoSaldo = cliente.saldo + valor

          await prisma.cliente.update({
            where: {
              id: id,
            },
            data: {
              saldo: { increment: valor },
              transacao: {
                create: {
                  descricao: descricao,
                  tipo: 'c',
                  valor: valor,
                },
              },
            },
          })

          return reply.send({ limite: cliente.limite, saldo: novoSaldo })
        }

        const novoSaldo = cliente.saldo - valor

        if (Math.abs(novoSaldo) > cliente.limite) {
          return reply.status(422).send()
        }

        try {
          await prisma.$transaction(async (tx) => {
            const author = await tx.cliente.update({
              data: {
                saldo: {
                  decrement: valor,
                },
                transacao: {
                  create: {
                    descricao: descricao,
                    tipo: 'd',
                    valor: valor,
                  },
                },
              },
              where: { id: id },
            })

            if (Math.abs(author.saldo) > author.limite) {
              throw new Error('Limite ultrapassado.')
            }

            return author
          })
        } catch (error) {
          return reply.status(422).send()
        }

        return reply.send({ limite: cliente.limite, saldo: novoSaldo })
      } catch (error) {
        return reply.status(422).send()
      }
    },
  )
}

export default ClientesController
