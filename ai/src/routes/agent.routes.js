import { Router } from 'express'
import agent from '../agent/code.agent.js'


const agentRouter = Router()

agentRouter.post('/invoke', async (req, res) => {
    try {
        const { message, sandboxID } = req.body
        const response = await agent.stream({ messages: [{ role: 'user', content: message }] }, { context: { sandboxID } })

        for await (const chunk of response) {
            console.log("====================================");
            console.log("Chunk from agent:");
            console.dir(chunk, { depth: null }); // 👈 better than console.log
            console.log("====================================");
        }

        res.status(200).json({
            status: 'success',
            response
        })
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message })
    }
})
export default agentRouter

