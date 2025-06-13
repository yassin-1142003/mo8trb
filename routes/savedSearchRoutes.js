import express from "express";
import {
  createSavedSearch,
  getUserSavedSearches,
  getSavedSearchById,
  executeSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
} from "../controllers/savedSearchController.js";


const router = express.Router();

// All routes require authentication


// Create a new saved search
router.post("/", createSavedSearch);

// Get all saved searches for the authenticated user
router.get("/", getUserSavedSearches);

// Get a specific saved search
router.get("/:id", getSavedSearchById);

// Execute a saved search (run the search)
router.post("/:id/execute", executeSavedSearch);

// Update a saved search
router.put("/:id", updateSavedSearch);

// Delete a saved search
router.delete("/:id", deleteSavedSearch);

export default router;
