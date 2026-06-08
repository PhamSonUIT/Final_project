import express from 'express';
import { login, register,createAccount } from '../controllers/authController.js';

const authRoutes = express.Router();

authRoutes.post("/signin", login);
authRoutes.post("/signup", register);
authRoutes.post("/create-account",createAccount)

export default authRoutes;