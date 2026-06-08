import express from "express";
import { verifyToken } from "../configs/authMiddleware.js";
import {
  registerMonthlyTicket,
  checkPrice,
  createPayOSCheckout,
  getProfile,
  updateProfile,
  requestOTP,
  handlePayOSCallback, 
} from "../controllers/userController.js";

const userRoutes = express.Router();

userRoutes.post("/month-ticket", verifyToken, registerMonthlyTicket); 
userRoutes.post("/monthly-register", verifyToken, registerMonthlyTicket); 
userRoutes.post("/checkPrice", checkPrice); 
userRoutes.post("/payos-checkout", verifyToken, createPayOSCheckout); 
userRoutes.get("/profile", verifyToken, getProfile); 
userRoutes.put("/update-profile", verifyToken, updateProfile); 
userRoutes.post("/request-otp", verifyToken, requestOTP);

userRoutes.post("/payos-webhook", handlePayOSCallback);
userRoutes.get("/payos-webhook", handlePayOSCallback); 

export default userRoutes;