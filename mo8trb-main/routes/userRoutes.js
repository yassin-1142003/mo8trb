import express from "express";
import {
  getProfile,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import {
  authenticate,
  requireAdmin,
  checkOwnershipOrAdmin,
} from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadmiddleware.js";

const router = express.Router();

// Current user profile
router.get("/profile", authenticate, getProfile);

// Admin: list & create users
router
  .route("/")
  .get(authenticate, requireAdmin, getAllUsers)
  .post(
    authenticate,
    requireAdmin,
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "national_id_pic", maxCount: 1 },
    ]),
    createUser
  );

// Single user by ID
router
  .route(":id")
  .get(authenticate, checkOwnershipOrAdmin, getUserById)
  .put(
    authenticate,
    checkOwnershipOrAdmin,
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "national_id_pic", maxCount: 1 },
    ]),
    updateUser
  )
  .delete(authenticate, requireAdmin, deleteUser);

export default router;
