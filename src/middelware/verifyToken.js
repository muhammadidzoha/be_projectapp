import jwt from "jsonwebtoken";
import { errorResponse } from "../helpers/ResponseHelper.js";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return errorResponse(res, null, "Token tidak ditemukan");

  jwt.verify(token, process.env.APP_ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return errorResponse(res, err, "Token tidak valid");
    req.user = decoded;
    next();
  });
};
