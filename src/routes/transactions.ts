/* eslint-disable prettier/prettier */
import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {

    app.get('/', 
    {
        preHandler: [checkSessionIdExists]
    },
    async (request) => {
        const { sessionId } = request.cookies

        const transactions = await knex('transactions').where('session_id', sessionId).select()

        return {
            transactions,
        }
    })
    
    app.get('/:id',
    {
        preHandler: [checkSessionIdExists]
    },
    async (request) => {
        const getTransactionParamsSchema = z.object({
            id: z.string().uuid()
        })

        const { id } = getTransactionParamsSchema.parse(request.params)

        const { sessionId } = request.cookies

        const transaction = await knex('transactions').where({
            session_id: sessionId,
            id
        }).first()

        return { transaction }
    })

    app.get('/summary',
    {
        preHandler: [checkSessionIdExists]
    },
    async (request) => {
        const { sessionId } = request.cookies

        const summary = await knex('transactions').where(
            'session_id', sessionId
        ).sum('amaunt', { as: 'amount'}).first()

        return {summary}
    })

    app.post('/', async (request, reply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amaunt: z.number(),
            type: z.enum(['credit', 'debit'])
        })

        const { title, amaunt, type } = createTransactionBodySchema.parse(request.body)

        let sessionId = request.cookies.sessionId

        if (!sessionId) {
            sessionId = randomUUID()

            reply.cookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            })
        }

        await knex('transactions').insert({
            id: randomUUID(),
            title,
            amaunt: type === 'credit' ? amaunt : amaunt * -1,
            session_id: sessionId
        })

        return reply.status(201).send()
    })
}
