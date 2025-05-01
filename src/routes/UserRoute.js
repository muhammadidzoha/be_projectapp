import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/UserController.js";
import { verifyToken } from "../middelware/verifyToken.js";
import { roleBased } from "../middelware/roleBased.js";

const router = Router();

router.get("/users", verifyToken, roleBased("admin"), getUsers);
router.get("/users/:id", verifyToken, getUserById);
router.patch("/users/:id", verifyToken, updateUser);
router.delete("/users/:id", verifyToken, deleteUser);

export default router;
