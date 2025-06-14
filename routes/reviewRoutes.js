import express from "express";
import {
  createReview,
  getApartmentReviews,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();

// Create a new review for an apartment (requires auth)
router.post("/:apartmentId", authenticateToken, createReview);

// Get all reviews for a specific apartment (public)
router.get("/:apartmentId", getApartmentReviews);

// Update a review by ID (requires auth)
router.put("/:reviewId", authenticateToken, updateReview);

// Delete a review by ID (requires auth)
router.delete("/:reviewId", authenticateToken, deleteReview);

export default router;
