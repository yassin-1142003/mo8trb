// Option 1: Update your main app.js/server.js to mount routes under /api/users/
// In your main server file:
import express from "express";
import authRoutes from "./routes/authRoutes.js"; // or wherever your auth routes are

const app = express();

// Mount auth routes under /api/users/ instead of /api/auth/
app.use("/api/users", authRoutes);

// Option 2: If you want to keep the current structure, 
// create a separate userRoutes.js file:

// routes/userRoutes.js
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

// Then in your main server file:
// app.use("/api/users", userRoutes);

// Option 3: If you want both /api/auth/ and /api/users/ to work:
// In your main server file:
import authRoutes from "./routes/authRoutes.js";

app.use("/api/auth", authRoutes);  // Original routes
app.use("/api/users", authRoutes); // Same routes under different path