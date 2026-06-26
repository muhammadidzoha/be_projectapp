import { Router } from "express";
import { verifyToken } from "../middelware/verifyToken.js";
import {
  addStaff,
  deleteStaff,
  getStaffs,
  updateStafff,
} from "../controllers/StaffController.js";

export const staffRouter = Router();

staffRouter.get("/staffs", verifyToken, getStaffs);
staffRouter.post("/staffs", verifyToken, addStaff);
staffRouter.put("/staffs/:id", verifyToken, updateStafff);
staffRouter.delete("/staffs/:id", verifyToken, deleteStaff);
