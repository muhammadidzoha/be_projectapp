import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import Routes from "./routes/Routes.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://feprojectapp-production-f71f.up.railway.app"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Routing
app.use(Routes);

app.listen(process.env.API_PORT, () => {
  console.log(`Server is running on port ${process.env.API_PORT}`);
});
