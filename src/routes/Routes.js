import { Router } from "express";
import UserRoutes from "./UserRoute.js";
import AuthRoutes from "./AuthRoute.js";
import TokenRoutes from "./TokenRoute.js";
import ProvinceRoutes from "./ProvinceRoute.js";
import CitiesRoutes from "./CityRoute.js";
import InstitutionRoutes from "./InstitutionRoute.js";
import CategoryRoutes from "./CategoryRoute.js";
import QuesionerRoutes from "./QuesionerRoute.js";
import TeacherRoutes from "./TeacherRoute.js";
import ClassesRoutes from "./ClassesRoute.js";
import FamilyRoutes from "./FamilyRoute.js";
import JobRoutes from "./JobRoute.js";
import StudentRoutes from "./StudentRoute.js";
import ResponsesRoutes from "./ResponseQuesionerRoute.js";

const router = Router();

router.use("/api", UserRoutes);
router.use("/api/auth", AuthRoutes);
router.use("/api", TokenRoutes);
router.use("/api", ProvinceRoutes);
router.use("/api", CitiesRoutes);
router.use("/api", InstitutionRoutes);
router.use("/api", CategoryRoutes);
router.use("/api", QuesionerRoutes);
router.use("/api", TeacherRoutes);
router.use("/api", ClassesRoutes);
router.use("/api", FamilyRoutes);
router.use("/api", JobRoutes);
router.use("/api", StudentRoutes);
router.use("/api", ResponsesRoutes);

export default router;
