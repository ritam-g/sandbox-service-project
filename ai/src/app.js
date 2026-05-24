import morgan from 'morgan'
import express from 'express'
import agentRouter from './routes/agent.routes.js'
import cors from 'cors'
const app = express()

// this is middleware for parsing json bodies, with a size limit to prevent abuse
app.use(express.json(
    {
        limit: '10mb'
    }
))
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://supreme-potato-pj4v4xgpxwpvc6p4-5173.app.github.dev',
    'https://supreme-potato-pj4v4xgpxwpvc6p4-5174.app.github.dev'
]

app.use(cors({
    origin: function(origin, callback) {

        // allow non-browser requests
        if (!origin) return callback(null, true)

        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },

    credentials: true,

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With'
    ]
}))
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


app.use('/api/ai/agent',agentRouter)
export default app