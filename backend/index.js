import express from "express";
import cors from "cors";
import rootRoutes from "./src/routes/rootRoute.js";

const JWT_SECRET = process.env.JWT;

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use("/api", rootRoutes);

app.listen(3000, () => {
  console.log("68.183.102.106:3000");
});
