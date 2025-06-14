import express from "express";
import upload from "../middleware/uploadmiddleware.js";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

// Registration with optional avatar & national ID images
router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "national_id_pic", maxCount: 1 },
  ]),
  register
);

// Login
router.post("/login", login);

export default router;
