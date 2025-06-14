import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";

import {
  createApartment,
  getAllApartments,
  getMyApartments,
  getApartmentById,
  updateApartment,
  deleteApartment,
  bookApartment,
} from "../controllers/apartmentController.js";
("../middleware/uploadmiddleware.js");


dotenv.config();
const app = express();
const router = express.Router();
// Middleware للتعامل مع JSON و form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إعداد multer لرفع الصور
const uploadDir = "uploads/apartments/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "apartment-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Middleware للتوثيق مع تشخيص أفضل للأخطاء
export const authenticate = (req, res, next) => {
  console.log("=== Authentication Debug ===");
  console.log("All headers:", JSON.stringify(req.headers, null, 2));

  const authHeader = req.headers.authorization;
  console.log("Raw authorization header:", JSON.stringify(authHeader));

  if (!authHeader) {
    console.log("No authorization header found");
    return res.status(401).json({ message: "No token provided" });
  }

  // فحص الأحرف غير المرئية
  const cleanHeader = authHeader.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  console.log("Cleaned header:", JSON.stringify(cleanHeader));

  if (cleanHeader !== authHeader) {
    console.log("Found invisible characters in header!");
    return res.status(400).json({
      message: "Invalid characters in authorization header",
      original: authHeader.length,
      cleaned: cleanHeader.length,
    });
  }

  // التحقق من صيغة Bearer token
  if (!authHeader.startsWith("Bearer ")) {
    console.log("Header does not start with Bearer");
    return res.status(401).json({
      message: "Invalid token format. Use: Bearer <token>",
      received: authHeader.substring(0, 20) + "...",
    });
  }

  const token = authHeader.split(" ")[1];
  console.log(
    "Extracted token:",
    token ? token.substring(0, 20) + "..." : "null"
  );

  if (!token) {
    return res.status(401).json({ message: "No token provided after Bearer" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified successfully for user:", decoded.id);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    res.status(403).json({
      message: "Invalid token",
      error: err.message,
    });
  }
};

// middleware للتعامل مع أخطاء رفع الملفات
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ message: error.message });
  } else if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

// مسار تسجيل الدخول
app.post("/login", (req, res) => {
  console.log("Request body:", req.body);
  console.log("Content-Type:", req.headers["content-type"]);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password required",
      received: req.body,
    });
  }

  // تحقق بسيط للمثال
  if (email === "yijsjksksmussef@example.com" && password === "123456") {
    const token = jwt.sign({ id: 123, email }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({
      token,
      message: "Login successful",
      user: { id: 123, email },
    });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// مسار إنشاء شقة جديدة - هذا المسار المفقود!
app.post("/api/apartments", authenticate, (req, res) => {
  // استخدام multer لمعالجة رفع الصورة
  uploadApartmentImage(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {});
    }

    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);
    console.log("Authenticated user:", req.user);

    // استخراج البيانات من الطلب
    const {
      name,
      location,
      rental_price,
      floor_number,
      is_featured,
      listing_type,
      availability_date,
      features,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !location || !rental_price) {
      return res.status(400).json({
        message: "Name, location, and rental_price are required",
        received: req.body,
      });
    }

    // بناء بيانات الشقة
    const normalizedListingType = listingTypeMapping[req.body.listing_type];

    if (!normalizedListingType) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing_type",
        valid_types: ["rent", "sale", "for_rent", "for_sale", "both"],
      });
    }

    console.log("🔍 Original listing_type received:", listing_type);

    // ✅ Normalize the listing_type (handle both cases)
    if (!normalizedListingType) {
      console.log("❌ Invalid listing_type:", listing_type);
      return res.status(400).json({
        success: false,
        message: "Invalid listing_type",
        // ✅ Fixed: Show the input keys that are accepted
        valid_input_types: Object.keys(listingTypeMapping),
        // ✅ Also show the normalized output values
        valid_output_types: ["for_rent", "for_sale", "both"],
        received_type: listing_type,
      });
    }

    console.log("✅ Normalized listing_type:", normalizedListingType);

    // Numeric validation
    const numericValidation = {
      price: parseFloat(price) || 0,
      bedrooms: parseInt(bedrooms) || 0,
      bathrooms: parseInt(bathrooms) || 0,
      square_fee: parseFloat(square_fee) || 0,
      floor_number: parseInt(floor_number) || 0,
    };
    const parsedAvailabilityDate = availability_date
      ? new Date(availability_date)
      : new Date();

    // Parse features
    let parsedFeatures = [];
    if (features) {
      try {
        parsedFeatures =
          typeof features === "string" ? JSON.parse(features) : features;
      } catch (error) {
        console.log("Features parsing error:", error);
        parsedFeatures = [];
      }
    }

    // بناء بيانات الشقة - ✅ Updated field names to match backend
    // Store relative path including subfolder so the static route can resolve it
const apartmentPics = req.file ? `/uploads/apartments/${req.file.filename}` : null;

    // ✅ بناء بيانات الشقة - مع الحقول المُحدثة
    const apartmentData = {
      title: title.trim(),
      description: description?.trim() || "",
      price: numericValidation.price,
      bedrooms: numericValidation.bedrooms,
      bathrooms: numericValidation.bathrooms,
      square_fee: numericValidation.square_fee,
      address: address.trim(),
      city: city?.trim() || "",
      town: town?.trim() || "",
      is_furnished: is_furnished === "true" || is_furnished === true,
      floor_number: numericValidation.floor_number,
      is_featured: is_featured === "true" || is_featured === true,
      listing_type: normalizedListingType, // ✅ Use normalized value
      availability_date: parsedAvailabilityDate,
      features: parsedFeatures,
      apartment_pics: apartmentPics,
      owner: req.user._id,
    };

    // هنا ستحفظ البيانات في قاعدة البيانات
    // مثال: await Apartment.create(apartmentData);

    console.log("Created apartment:", apartmentData);

    res.status(201).json({
      message: "Apartment created successfully",
      apartment: apartmentData,
    });
  });
});

// مسار للحصول على جميع الشقق
app.get("/api/apartments", (req, res) => {
  // مثال على البيانات - في التطبيق الحقيقي ستجلب من قاعدة البيانات
  const apartments = [
    {
      id: 1,
      name: "Luxury Apartment Downtown",
      location: "Downtown",
      rental_price: 1500,
      floor_number: 5,
      is_featured: true,
      listing_type: "rent",
      availability_date: "2025-06-15",
      features: ["AC", "Wi-Fi", "Parking"],
      apartment_pic: "apartment-123.jpg",
    },
  ];

  res.json({
    message: "Apartments retrieved successfully",
    apartments,
  });
});

// مسار الاختبار المحسن
app.post("/test", (req, res) => {
  res.json({
    body: req.body,
    headers: req.headers,
    contentType: req.headers["content-type"],
    authorization: req.headers.authorization,
    authLength: req.headers.authorization
      ? req.headers.authorization.length
      : 0,
  });
});

// مسار خاص لاختبار التوثيق
app.get("/test-auth", (req, res) => {
  const authHeader = req.headers.authorization;

  res.json({
    hasAuthHeader: !!authHeader,
    authHeader: authHeader,
    authLength: authHeader ? authHeader.length : 0,
    authBytes: authHeader
      ? Array.from(authHeader).map((c) => c.charCodeAt(0))
      : [],
    startsWithBearer: authHeader ? authHeader.startsWith("Bearer ") : false,
    allHeaders: req.headers,
  });
});

// مسار محمي للاختبار
app.post("/protected", authenticate, (req, res) => {
  res.json({
    message: `Hello user ${req.user.id}`,
    user: req.user,
  });
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// مسار للتعامل مع الطلبات غير الموجودة
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});


export default app;
