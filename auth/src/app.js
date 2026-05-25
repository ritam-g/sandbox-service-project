import 'dotenv/config';
import express from 'express'
import morgan from 'morgan';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-google-oauth20';


const app = express();
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
}))
app.use(morgan('dev'));

app.get('/api/auth/health', (req, res) => {
    res.json({
        status: 'ok'
    });
});

export default app;
