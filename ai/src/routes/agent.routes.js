import { Router } from 'express'
import agent from '../agent/code.agent.js'


const agentRouter = Router()

agentRouter.post('/invoke', async (req, res) => {
    try {
        const { message } = req.body
        const response = await agent.invoke({ messages: message })
        res.status(200).json({
            status: 'success',
            response
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})
export default agentRouter

