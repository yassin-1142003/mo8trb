//routes/apartments.js
import express from 'express';
import {
  createApartment,
  getAllApartments,
  getMyApartments,
  getApartmentById,
  updateApartment,
  deleteApartment,
  bookApartment
} from '../controllers/apartmentController.js';
import { uploadApartmentImage, handleUploadError } from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
// Get all apartments
router.get('/', getAllApartments);

// Get specific apartment by ID  
router.get('/:id', getApartmentById);

// Protected routes (authentication required)
// IMPORTANT: This route MUST come before /:id to avoid conflicts
router.get('/my/apartments', authenticate, getMyApartments);

// Create new apartment (requires authentication and image upload)
router.post('/', authenticate, uploadApartmentImage, handleUploadError, createApartment);

// Update apartment (requires authentication and may include new images)
router.put('/:id', authenticate, uploadApartmentImage, handleUploadError, updateApartment);

// Delete apartment (requires authentication)
router.delete('/:id', authenticate, deleteApartment);

// Book apartment (requires authentication)
router.post('/:id/book', authenticate, bookApartment);

export default router;