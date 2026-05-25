import 'dotenv/config';
import { Router } from 'express';
import passport from 'passport';
import userModel from '../models/user.model.js';
import jwt from 'jsonwebtoken';
const authRouter = Router();

authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
authRouter.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), async (req, res) => {
    // Successful authentication, redirect home or send a token.
    const user = req.user;
    // Check if user exists in DB, if not create a new user
    try {
        let existingUser = await userModel.findOne({ googleId: user.id });
        if (!existingUser) {
            existingUser = await userModel.create({
                googleId: user.id,
                email: user.emails[0].value,
                name: user.displayName
            });
        }
        // creat user in db if not exists
        const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET || 'jwt_secret', { expiresIn: '1h' });
        res.cookie('token', token)
        res.redirect('/')
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }

});
export default authRouter;