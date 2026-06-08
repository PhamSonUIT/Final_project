import express from "express";
import { verifyToken } from "../configs/authMiddleware.js";
import { checkAdminRole } from "../configs/roleMiddleware.js";
import {
  updateVehicleTypePrice,
  getAllVehicleTypes,
  getVehicleTypePrice,
  updateAllPrices,
  getEmployees,
  getCustomers,
  getMonthlyTicketsAdmin,
  getParkingTransactionsAdmin,
  getRevenueStats,
} from "../controllers/adminController.js";

const adminRoutes = express.Router();

adminRoutes.use(verifyToken, checkAdminRole);

adminRoutes.get("/vehicle-types", getAllVehicleTypes);
adminRoutes.get("/vehicle-types/:vehicleTypeId", getVehicleTypePrice);
adminRoutes.put("/vehicle-types/:vehicleTypeId", updateVehicleTypePrice);
adminRoutes.post("/update-pricing", updateAllPrices);

adminRoutes.get("/employees", getEmployees); 
adminRoutes.get("/customers", getCustomers); 

adminRoutes.get("/vehicles/monthly", getMonthlyTicketsAdmin);
adminRoutes.get("/vehicles/transactions", getParkingTransactionsAdmin);
adminRoutes.get("/revenue/stats", getRevenueStats);

export default adminRoutes;