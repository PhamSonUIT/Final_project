import express from "express";
import {
  checkParking,
  detectVehicleType,
  getAvailableSlots,
  sendHistoryOTP,    // 🌟 THÊM TRƯỜNG NÀY
  getVehicleHistory, // 🌟 THÊM TRƯỜNG NÀY
} from "../controllers/parkingController.js";
import { verifyToken } from "../configs/authMiddleware.js"; // 🌟 IMPORT MIDDLEWARE AUTH CỦA SƠN

const parkingRoutes = express.Router();

parkingRoutes.post("/check-parking", verifyToken, checkParking);
parkingRoutes.post("/detect-type", detectVehicleType);
parkingRoutes.get("/slots", getAvailableSlots);
parkingRoutes.post("/send-history-otp", verifyToken, sendHistoryOTP);
parkingRoutes.post("/get-history", verifyToken, getVehicleHistory);

export default parkingRoutes;