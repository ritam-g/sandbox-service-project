import { Router } from 'express'
import agent from '../agent/code.agent.js'


const agentRouter = Router()

agentRouter.post('/invoke', async (req, res) => {
    try {
        const { message, sandboxID } = req.body
        const response = await agent.invoke({ messages: [{ role: 'user', content: message }] }, { context: { sandboxID } })
        res.status(200).json({
            status: 'success',
            response
        })
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message })
    }
})
export default agentRouter

