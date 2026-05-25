import 'dotenv/config';
import express from 'express'
import morgan from 'morgan';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import authRouter from './routes/auth.route.js';

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
app.use(passport.initialize());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    // In a real application, you'd verify the user and store them in your database here.
    // For this example, we'll just return the profile information.
    return done(null, profile);
}));


app.get('/api/auth/health', (req, res) => {
    res.json({
        status: 'ok'
    });
});

app.use('/api/auth',authRouter)
export default app;
