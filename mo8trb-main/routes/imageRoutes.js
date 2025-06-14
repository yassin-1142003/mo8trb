// routes/imageRoutes.js
import express from 'express';
import multer from 'multer';
import Image from '../models/image.model.js';
import { authenticate } from '../middleware/authMiddleware.js'; // لو عندك middleware توثيق

const router = express.Router();

// إعداد multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // مسار حفظ الصور
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  }
});
const upload = multer({ storage });

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

export default router;
