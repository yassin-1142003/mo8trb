// routes/imageRoutes.js
import express from 'express';
import upload from '../middlewares/upload.js';
import Image from '../models/image.model.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/authMiddleware.js'; // لو عندك middleware توثيق

const router = express.Router();

// Multer config moved to middleware/upload.js
// storage config removed – using centralized upload middleware
// (legacy local storage removed – using centralized upload middleware)


// رفع صورة وربطها بشقة مثلاً (هتحتاج تمرر apartmentId في الـ body أو الـ params)
router.post('/upload/:apartmentId', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { apartmentId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const newImage = new Image({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      apartment: apartmentId,
      usageType: 'apartment',
    });

    await newImage.save();

    res.status(201).json({ success: true, image: newImage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


/**
 * POST /api/images/profile
 * Upload current user's avatar
 */
router.post('/profile', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Load user document, update avatar
    const userDoc = await User.findById(req.user.id || req.user._id);
    if (!userDoc) return res.status(404).json({ message: 'User not found' });
    userDoc.avatar = req.file.filename;
    await userDoc.save();

    res.status(200).json({ success: true, avatar: `/uploads/${userDoc.avatar}` });
  } catch (error) {
    console.error('Profile upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/images/id-card
 * Upload user's national ID picture
 */
router.post('/id-card', authenticate, upload.single('national_id_pic'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userDoc = await User.findById(req.user.id || req.user._id);
    if (!userDoc) return res.status(404).json({ message: 'User not found' });
    userDoc.national_id_pic = req.file.filename;
    await userDoc.save();

    res.status(200).json({ success: true, national_id_pic: `/uploads/${userDoc.national_id_pic}` });
  } catch (error) {
    console.error('ID card upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
