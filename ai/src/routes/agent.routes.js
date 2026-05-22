import { Router } from 'express'
import agent from '../agent/code.agent.js'

const agentRouter = Router()

agentRouter.post('/invoke', async (req, res) => {
    try {

        const { message, sandboxID } = req.body

        // 🔥 STEP 1: SSE HEADERS
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        // optional: send initial event
        res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);

        // 🔥 STEP 2: START STREAM
        const stream = await agent.stream(
            {
                messages: [{ role: 'user', content: message }]
            },
            {
                configurable: { sandboxID }
            }
        );

        // 🔥 STEP 3: FORWARD CHUNKS TO CLIENT
        for await (const chunk of stream) {

            console.log("Chunk from agent:");
            console.dir(chunk, { depth: null });

            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        // 🔥 STEP 4: END STREAM
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (error) {
        console.error(error);

        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
})

export default agentRouter