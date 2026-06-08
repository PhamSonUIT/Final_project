import express from "express";
import authRoutes from "./authRoute.js";
import parkingRoutes from "./parkingRoute.js";
import adminRoutes from "./adminroute.js";
import userRoutes from "./userRoute.js";

const rootRoutes = express.Router();

rootRoutes.use("/auth", authRoutes); 
rootRoutes.use("/parking", parkingRoutes);
rootRoutes.use("/admin", adminRoutes); 
rootRoutes.use("/users", userRoutes); 

export default rootRoutes;
