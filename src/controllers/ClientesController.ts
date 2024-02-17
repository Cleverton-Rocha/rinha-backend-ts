import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { BodyType, Extrato, ParamsType } from '../utils/types'

const prisma = new PrismaClient()

const schema = z.object({
  valor: z.number().int().positive(),
  tipo: z.string().refine((x) => ['c', 'd'].includes(x), {
    message: 'O tipo da transação deve ser "c" ou "d"',
  }),
  descricao: z.string().min(1).max(10),
})

async function ClientesController(fastify: FastifyInstance) {
  fastify.get(
    '/clientes/:id/extrato',
    async (
      request: FastifyRequest<{ Params: ParamsType }>,
      reply: FastifyReply,
    ) => {
      const id = parseInt(request.params.id, 10)

      const cliente = await prisma.cliente.findFirst({
        where: {
          id: id,
        },
      })

      if (!cliente)
        return reply.status(404).send({ error: 'Cliente não encontrado.' })

      const ultimasTransacoes = await prisma.transacao.findMany({
        select: {
          valor: true,
          tipo: true,
          descricao: true,
          realizada_em: true,
        },
        where: {
          id_cliente: id,
        },
        orderBy: {
          realizada_em: 'desc',
        },
      })

      const extrato: Extrato = {
        saldo: {
          total: cliente.saldo,
          data_extrato: new Date().toISOString(),
          limite: cliente.limite,
        },
        ultimas_transacoes: ultimasTransacoes,
      }

      return reply.status(200).send(extrato)
    },
  )

  fastify.post(
    '/clientes/:id/transacoes',
    async (
      request: FastifyRequest<{ Params: ParamsType; Body: BodyType }>,
      reply: FastifyReply,
    ) => {
      const data = request.body
      console.log(data)
      const validatedData = schema.safeParse(data)
      if (!validatedData.success) {
        return reply.code(400).send({
          success: false,
          error: {
            message: 'Erro de validação do corpo da requisição',
            details: validatedData.error.errors,
          },
        })
      }

      const id = parseInt(request.params.id, 10)
      const cliente = await prisma.cliente.findFirst({
        where: {
          id: id,
        },
      })
      if (!cliente)
        return reply.status(404).send({ error: 'Cliente não encontrado.' })

      const novoSaldo =
        data.tipo === 'd'
          ? cliente.saldo - data.valor
          : cliente.saldo + data.valor

      if (data.tipo === 'd' && novoSaldo < cliente.limite * -1) {
        return reply.code(422).send({ error: 'Limite insuficiente' })
      }

      const result = await prisma.cliente.update({
        where: {
          id: cliente.id,
        },
        data: { saldo: novoSaldo },
        select: { saldo: true, limite: true },
      })

      await prisma.transacao.create({
        data: {
          valor: data.valor,
          tipo: data.tipo,
          descricao: data.descricao,
          cliente: {
            connect: { id: cliente.id },
          },
        },
      })

      return reply.status(200).send(result)
    },
  )
}

export default ClientesController
