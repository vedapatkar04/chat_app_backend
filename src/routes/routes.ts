import { Router } from "express";
import { register } from "../controllers/register";
import { login } from "../controllers/login";

const router = Router();

router.post("/login", login);
router.post("/register", register);
 
export default router;