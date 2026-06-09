import express from "express";
import cors from "cors";
import rootRoutes from "./src/routes/rootRoute.js";

const JWT_SECRET = process.env.JWT;

const app = express();

app.use(cors({ origin: "http://134.209.210.226:3001", credentials: true }));
app.use(express.json({ limit: "50mb" }));

app.use("/api", rootRoutes);

app.listen(3000, () => {
  console.log("134.209.210.226:3000");
});
