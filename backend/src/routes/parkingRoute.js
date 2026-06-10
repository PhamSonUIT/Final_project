import express from "express";
import {
  checkParking,
  detectVehicleType,
  getAvailableSlots,
  sendHistoryOTP,   
  getVehicleHistory,
  updatePrice,      
} from "../controllers/parkingController.js";
import { verifyToken } from "../configs/authMiddleware.js"; 

const parkingRoutes = express.Router();

parkingRoutes.post("/check-parking", verifyToken, checkParking);
parkingRoutes.post("/detect-type", detectVehicleType);
parkingRoutes.get("/slots", getAvailableSlots);
parkingRoutes.post("/send-history-otp", verifyToken, sendHistoryOTP);
parkingRoutes.post("/get-history", verifyToken, getVehicleHistory);
parkingRoutes.put("/update-price", verifyToken, updatePrice);
export default parkingRoutes;