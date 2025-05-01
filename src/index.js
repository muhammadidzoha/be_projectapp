import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import UserRoutes from "./routes/UserRoute.js";
import AuthRoutes from "./routes/AuthRoute.js";
import TokenRoutes from "./routes/TokenRoute.js";
import ProvinceRoutes from "./routes/ProvinceRoute.js";
import CitiesRoutes from "./routes/CityRoute.js";
import InstitutionRoutes from "./routes/InstitutionRoute.js";
import CategoryRoutes from "./routes/CategoryRoute.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Routing
app.use("/api", UserRoutes);
app.use("/api/auth", AuthRoutes);
app.use("/api", TokenRoutes);
app.use("/api", ProvinceRoutes);
app.use("/api", CitiesRoutes);
app.use("/api", InstitutionRoutes);
app.use("/api", CategoryRoutes);

app.listen(process.env.APP_PORT, () => {
  console.log(`Server is running on port ${process.env.APP_PORT}`);
});
