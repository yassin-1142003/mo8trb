// Auth routes
import express from "express";
import upload from "../middleware/uploadmiddleware.js";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

// These will be accessible as /api/users/register and /api/users/login
router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "national_id_pic", maxCount: 1 },
  ]),
  register
);

router.post("/login", login);


export default router;