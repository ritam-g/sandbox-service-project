import morgan from 'morgan'
import express from 'express'

const app = express()


app.use(express.json(
    {
        limit: '10mb'
    }
))
app.use(morgan('dev'))

app.get('/', (req, res) => {
    return res.status(200).json({
        status: 'success',
        message: 'AI service running'
    })
})

app.get('/health', (req, res) => {
    return res.status(200).json({
        status: 'ok'
    })
})

app.get('/api/ai/healthz', (req, res) => {
    return res.status(200).json({
        status: 'ok'
    })
})
app.get('/api/ai', (req, res) => {
    return res.status(200).json({
        status: 'ok'
    })
})

export default app