import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import multer from "multer";
import {
  createApartment,
  getAllApartments,
  getApartmentById,
  updateApartment,
  deleteApartment,
  deleteApartmentImage,
} from "../controllers/apartmentController.js";

const router = express.Router();

// إعداد رفع الصور باستخدام multer
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
});

// ✅ إنشاء شقة جديدة (مع رفع صور) - مستخدم مسجل
router.post(
  "/",
  authenticateToken,
  upload.array("apartment_pics", 10),
  createApartment
);

// ✅ جلب جميع الشقق (عامة)
router.get("/", getAllApartments);

// ✅ جلب شقة معينة برقم ID
router.get("/:id", getApartmentById);

// ✅ تعديل بيانات شقة - المالك فقط أو الأدمن
router.put(
  "/:id",
  authenticateToken,
  upload.array("apartment_pics", 10),
  updateApartment
);

// ✅ حذف شقة معينة - المالك أو الأدمن
router.delete("/:id", authenticateToken, deleteApartment);

// ✅ حذف صورة معينة من شقة
router.delete(
  "/:id/images/:filename",
  authenticateToken,
  deleteApartmentImage
);

export default router;
