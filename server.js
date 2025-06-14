// ------------------ [ 1. استدعاء الحزم ] ------------------
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import fs from "fs";
import killPort from "kill-port";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import User from "./models/User.js";
import Apartment from "./models/Apartment.js";

// ------------------ [ 2. تحميل المتغيرات من .env ] ------------------
dotenv.config();

// ------------------ [ 3. إصلاح __dirname في ES Modules ] ------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ------------------ [ 4. تهيئة التطبيق ] ------------------
const app = express();

// ✅ Add compression middleware FIRST
// ✅ الضغط
app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);


// ------------------ [ 1. استدعاء الحزم ] ------------------
// ✅ JSON Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-Total-Count"],
  })
);

// ✅ Helmet (أمان)
app.use(helmet());

// ✅ Morgan (التسجيل)
app.use(morgan("dev"));

// ✅ Cookie Parser (for reading token from cookies as fallback)
app.use(cookieParser());

// ✅ Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// ✅ Logger داخلي
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ إنشاء مجلد للصور
let uploadsDir = path.join(__dirname, "uploads");
const createUploadsDir = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("✅ Uploads directory created:", uploadsDir);
    }
  } catch (error) {
    console.error("❌ Failed to create uploads dir:", error);
    uploadsDir = path.join("/tmp", "uploads");
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log("✅ Fallback uploads directory created:", uploadsDir);
      }
    } catch (fallbackError) {
      console.error("❌ Failed fallback dir:", fallbackError);
      uploadsDir = "./uploads";
    }
  }
};
createUploadsDir();
export { uploadsDir };

// ------------------ [ 6. Static uploads route ] ------------------
// Make uploaded images publicly accessible at https://<host>/uploads/<filename>
app.use("/uploads", express.static(uploadsDir));

// ------------------ [ 7. الراوتس (المسارات) ] ------------------

import userRoutes from "./routes/auth.js";
// import apartmentRoutes from "./routes/apartments.js"; // Disabled to prevent duplicate routing
import reviewRoutes from "./routes/reviewRoutes.js";
import savedSearchRoutes from "./routes/savedSearchRoutes.js";


// استخدمهم في التطبيق
app.use("/api/users", userRoutes);
// app.use("/api/apartments", apartmentRoutes); // Disabled duplicate router
app.use("/api/reviews", reviewRoutes);
// app.use("/api/saved-searches", savedSearchRoutes); // Duplicate mount removed, authentication enforced in routes


// ✅ API root - list all main endpoints
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Real Estate API - available endpoints",
    endpoints: {
      auth: {
        register: "POST /api/users/register",
        login: "POST /api/users/login",
        logout: "POST /api/users/logout",
        refresh: "POST /api/users/refresh",
        profile: "GET /api/users/profile",
        update_profile: "PUT /api/users/profile",
      },
      users_admin: {
        list_users: "GET /api/users (admin)",
        create_user: "POST /api/users (admin)",
        get_user: "GET /api/users/:id (admin)",
      },
      apartments: {
        create: "POST /api/apartments",
        list: "GET /api/apartments",
        my_apartments: "GET /api/apartments/my",
        single: "GET /api/apartments/:id",
        update: "PUT /api/apartments/:id",
      },
      reviews: {
        add: "POST /api/reviews/:apartmentId",
        update: "PUT /api/reviews/:reviewId",
        delete: "DELETE /api/reviews/:reviewId",
      },
      saved_searches: {
        create: "POST /api/saved-searches",
        list: "GET /api/saved-searches",
        stats: "GET /api/saved-searches/:id/stats",
        execute: "POST /api/saved-searches/:id/execute",
        delete: "DELETE /api/saved-searches/:id",
      },
      uploads: "GET /uploads/:filename",
      health: "GET /health",
    },
  });
});

// ✅ Enhanced MongoDB connection with retry logic
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

      if (!mongoURI) {
        throw new Error(
          "MONGO_URI or MONGODB_URI environment variable is required"
        );
      }

      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        // ❌ Removed: bufferMaxEntries: 0 (deprecated option)
      });

      console.log("✅ MongoDB Connected successfully");
      console.log("📍 Database:", mongoose.connection.name);
      return; // ✅ Exit function on success
    } catch (error) {
      retries++;
      console.error(
        `❌ MongoDB connection attempt ${retries} failed:`,
        error.message
      );

      if (retries === maxRetries) {
        console.error("❌ Max retries reached. Exiting...");
        process.exit(1);
      }

      // Wait before retrying (exponential backoff)
      console.log(`⏳ Retrying in ${Math.pow(2, retries)} seconds...`);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, retries) * 1000)
      );
    }
  }
};

// ✅ Enhanced User Schema with validation
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ["owner", "tenant", "admin"],
      default: "tenant",
    },
    role_id: String,
    national_id: { type: String, required: true },
    avatar: String,
    national_id_pic: String,
    phone: String, // ✅ Add phone field
    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
    email_verified: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// ✅ Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Using imported User model (defined in ./models/User.js)

// ✅ Enhanced Apartment Schema
const apartmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be positive"],
    },
    bedrooms: {
      type: Number,
      required: [true, "Bedrooms is required"],
      min: [0, "Bedrooms must be non-negative"],
    },
    bathrooms: {
      type: Number,
      required: [true, "Bathrooms is required"],
      min: [0, "Bathrooms must be non-negative"],
    },
    square_fee: {
      type: Number,
      required: [true, "Square fee is required"],
      min: [1, "Square feet must be positive"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    city: { type: String, required: [true, "City is required"], trim: true },
    town: { type: String, trim: true },
    is_furnished: { type: Boolean, default: false },
    floor_number: { type: Number, min: 0 },
    is_featured: { type: Boolean, default: false },
    listing_type: {
      type: String,
      enum: ["for_rent", "for_sale", "both"],
      required: true,
    },
    views: { type: Number, default: 0 },
    apartment_pics: [String], // ✅ Add apartment pictures field
    features: [String], // ✅ Add features field
    availability_date: Date, // ✅ Add availability date

    // ✅ أضف هذا الحقل
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// ✅ Enhanced Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// ✅ File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Max 10 files
  },
});

// ✅ Enhanced JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (authHeader) {
    token = authHeader; // token sent without Bearer prefix
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token; // token from cookies
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token missing",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    try {
      // ✅ Get fresh user data
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }
      // If the model contains a status field and it is not active, block access
      if (typeof user.status !== "undefined" && user.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "User is inactive or banned",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error during authentication",
      });
    }
  });
}

// ✅ Enhanced user registration
app.post(
  "/api/users/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "national_id_pic", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        password_confirmation,
        role,
        role_id,
        national_id,
        phone,
      } = req.body;

      console.log("📝 Registration attempt for:", email);

      // ✅ Input validation
      if (!name || !email || !password || !password_confirmation || !national_id) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: name, email, password, password_confirmation, national_id",
        });
      }

      // ✅ Check password and confirmation match
      if (password !== password_confirmation) {
        return res.status(400).json({
          success: false,
          message: "Password and confirmation do not match",
        });
      }

      // ✅ Check if user already exists by email or national_id (optional)
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered",
        });
      }

      // ✅ Create new user object
      const newUser = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: role || "tenant",
        role_id,
        national_id,
        phone,
      });

      // ✅ Attach uploaded files if any
      if (req.files) {
        if (req.files.avatar && req.files.avatar[0]) {
          newUser.avatar = `/uploads/${req.files.avatar[0].filename}`;
        }
        if (req.files.national_id_pic && req.files.national_id_pic[0]) {
          newUser.national_id_pic = `/uploads/${req.files.national_id_pic[0].filename}`;
        }
      }

      // ✅ Save user to DB (password hashing should be handled in User model pre-save middleware)
      await newUser.save();

      // ✅ Return success response (without password)
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          avatar: newUser.avatar,
          national_id: newUser.national_id,
          national_id_pic: newUser.national_id_pic,
          status: newUser.status,
        },
      });
    } catch (error) {
      console.error("❌ Registration error:", error);
      // Handle duplicate key error (email unique constraint)
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Email or National ID already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  }
);


// ✅ Enhanced apartment creation with detailed error handling and debugging
app.post(
  "/api/apartments",
  authenticateToken,
  upload.any(),
  async (req, res) => {
    // باقي الكود كما هو
    try {
      console.log("📝 Creating apartment - User:", req.user._id);
      console.log("📁 Files received:", req.files?.length || 0);
      console.log("📝 Request body:", req.body);

      const {
        title,
        description,
        price,
        bedrooms,
        bathrooms,
        square_fee,
        address,
        city,
        town,
        is_furnished,
        floor_number,
        is_featured,
        listing_type,
        availability_date,
        features,
      } = req.body;

      // ✅ Enhanced input validation with detailed logging
      console.log("🔍 Validating required fields...");
      const requiredFields = [
        "title",
        "description",
        "price",
        "bedrooms",
        "bathrooms",
        "square_fee",
        "address",
        "city",
        "listing_type",
      ];
      const missingFields = requiredFields.filter(
        (field) => !req.body[field] || req.body[field].toString().trim() === ""
      );

      if (missingFields.length > 0) {
        console.log("❌ Missing required fields:", missingFields);
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          required_fields: requiredFields,
          missing_fields: missingFields,
          received_fields: Object.keys(req.body),
        });
      }

      // ✅ Data type validation with error handling
      console.log("🔍 Validating data types...");

      // Validate numeric fields
      const numericValidation = {
        price: parseFloat(price),
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        square_fee: parseFloat(square_fee),
        floor_number: floor_number ? parseInt(floor_number) : undefined,
      };

      // Check for NaN values
      if (isNaN(numericValidation.price) || numericValidation.price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid price value. Must be a positive number",
          received_price: price,
        });
      }

      if (isNaN(numericValidation.bedrooms) || numericValidation.bedrooms < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid bedrooms value. Must be a non-negative integer",
          received_bedrooms: bedrooms,
        });
      }

      if (
        isNaN(numericValidation.bathrooms) ||
        numericValidation.bathrooms < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid bathrooms value. Must be a non-negative number",
          received_bathrooms: bathrooms,
        });
      }

      if (
        isNaN(numericValidation.square_fee) ||
        numericValidation.square_fee <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid square_fee value. Must be a positive number",
          received_square_fee: square_fee,
        });
      }

      // Validate listing_type
      const validListingTypes = ["for_sale", "for_rent", "both"];
      if (!validListingTypes.includes(listing_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid listing_type",
          valid_types: validListingTypes,
          received_type: listing_type,
        });
      }

      // ✅ Handle features parsing safely
      let parsedFeatures = [];
      if (features) {
        try {
          if (Array.isArray(features)) {
            parsedFeatures = features;
          } else if (typeof features === "string") {
            parsedFeatures = JSON.parse(features);
          }
          console.log("✅ Features parsed successfully:", parsedFeatures);
        } catch (featuresError) {
          console.log("❌ Error parsing features:", featuresError.message);
          return res.status(400).json({
            success: false,
            message: "Invalid features format. Must be valid JSON array",
            received_features: features,
            error: featuresError.message,
          });
        }
      }

      // ✅ Handle date parsing safely
      let parsedAvailabilityDate;
      if (availability_date) {
        try {
          parsedAvailabilityDate = new Date(availability_date);
          if (isNaN(parsedAvailabilityDate.getTime())) {
            throw new Error("Invalid date");
          }
        } catch (dateError) {
          console.log("❌ Error parsing availability_date:", dateError.message);
          return res.status(400).json({
            success: false,
            message: "Invalid availability_date format",
            received_date: availability_date,
          });
        }
      }

      // ✅ Handle multiple image uploads
      const apartmentPics = req.files ? req.files.map((file) => `/uploads/${file.filename}`) : [];
      console.log("📸 Processed apartment pics:", apartmentPics);

      // ✅ Create apartment object with validated data
      console.log("🏠 Creating apartment object...");
      const apartmentData = {
        title: title.trim(),
        description: description.trim(),
        price: numericValidation.price,
        bedrooms: numericValidation.bedrooms,
        bathrooms: numericValidation.bathrooms,
        square_fee: numericValidation.square_fee,
        address: address.trim(),
        city: city.trim(),
        town: town?.trim() || undefined,
        is_furnished: is_furnished === "true" || is_furnished === true,
        floor_number: numericValidation.floor_number,
        is_featured: is_featured === "true" || is_featured === true,
        listing_type, // ✅ صحيح
        availability_date: parsedAvailabilityDate,
        features: parsedFeatures,
        apartment_pics: apartmentPics,
        owner: req.user._id,
      };

      console.log(
        "📋 Final apartment data:",
        JSON.stringify(apartmentData, null, 2)
      );

      // ✅ Check if Apartment model is defined
      if (!Apartment) {
        throw new Error("Apartment model is not defined");
      }

      const apartment = new Apartment(apartmentData);

      console.log("💾 Saving apartment to database...");
      await apartment.save(); // احفظ بيانات الشقة في قاعدة البيانات

      console.log("✅ Apartment saved successfully with ID:", apartment._id);

      console.log("🎉 Apartment creation completed successfully");
      res.status(201).json({
        success: true,
        message: "Apartment created successfully",
        data: apartment,
      });
    } catch (error) {
      console.error("❌ Apartment creation error:", error);
      console.error("❌ Error stack:", error.stack);

      // ✅ Enhanced error response with more details
      let errorMessage = "Server error creating apartment";
      let statusCode = 500;
      if (error.name === "ValidationError") {
        errorMessage =
          "Validation error: " +
          Object.values(error.errors)
            .map((e) => e.message)
            .join(", ");
        statusCode = 400;
      } else if (error.code === 11000) {
        errorMessage = "Duplicate entry error";
        statusCode = 409;
      } else if (error.name === "CastError") {
        errorMessage = "Invalid data format";
        statusCode = 400;
      } else if (error.message.includes("Apartment model is not defined")) {
        errorMessage = "Database model configuration error";
        statusCode = 500;
      }

      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error_type: error.name,
        error_code: error.code,
        ...(process.env.NODE_ENV === "development" && {
          debug_info: {
            message: error.message,
            stack: error.stack,
            user_id: req.user?._id,
            request_body: req.body,
            files_count: req.files?.length || 0,
          },
        }),
      });
    }
  }
);


// ✅ Add a test endpoint to verify the setup
app.get("/api/apartments/test", authenticateToken, async (req, res) => {
  try {
    console.log("🧪 Testing apartment creation setup...");
    // Test database connection
    const testQuery = await Apartment.countDocuments();
    console.log("📊 Current apartments count:", testQuery);
    // Test user authentication
    console.log("👤 Authenticated user:", req.user._id);
    res.json({
      success: true,
      message: "Apartment API test successful",
      data: {
        database_connected: true,
        apartments_count: testQuery,
        user_authenticated: !!req.user._id,
        user_id: req.user._id,
      },
    });
  } catch (error) {
    console.error("❌ Test endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Test failed",
      error: error.message,
    });
  }
});

// ✅ Get all apartments - FIXED (Handle validation errors gracefully)
app.get("/api/apartments", async (req, res) => {
  try {
    console.log("📋 Fetching all apartments...");

    const apartments = await Apartment.find()
      .populate("owner", "name email phone")
      .sort({ created_at: -1 })
      .lean(); // Use lean() to avoid validation issues

    console.log(`✅ Found ${apartments.length} apartments`);

    res.json({
      success: true,
      data: apartments,
      count: apartments.length,
    });
  } catch (error) {
    console.error("❌ Get all apartments error:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching apartments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ✅ Get my apartments (user's own apartments) - FIXED (Handle validation errors)
app.get("/api/apartments/my", authenticateToken, async (req, res) => {
  try {
    console.log(`📋 Fetching apartments for user: ${req.user._id}`);

    const apartments = await Apartment.find({ owner: req.user._id })
      .populate("owner", "name email phone")
      .sort({ created_at: -1 })
      .lean(); // Use lean() to avoid validation issues

    console.log(`✅ Found ${apartments.length} apartments for user`);

    res.json({
      success: true,
      data: apartments,
      count: apartments.length,
    });
  } catch (error) {
    console.error("❌ Get my apartments error:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching your apartments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ✅ Get apartment by ID - FIXED (Better error handling and logging)
app.get("/api/apartments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 Requested apartment ID:", id);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("❌ Invalid ObjectId format");
      return res.status(400).json({
        success: false,
        message: "Invalid apartment ID format",
      });
    }

    console.log("🔍 Searching for apartment...");

    // First, try to find the apartment without populating
    const apartmentExists = await Apartment.findById(id).lean();

    if (!apartmentExists) {
      console.log("❌ Apartment not found in database");
      return res.status(404).json({
        success: false,
        message: "Apartment not found",
      });
    }

    console.log("✅ Apartment exists, now populating owner data...");

    // If apartment exists, get it with populated owner data
    const apartment = await Apartment.findById(id)
      .populate("owner", "name email phone")
      .lean();

    console.log("✅ Apartment found with owner data");

    // Update views count safely
    try {
      console.log("📈 Updating views count...");
      await Apartment.findByIdAndUpdate(
        id,
        { $inc: { views: 1 } },
        { runValidators: false }
      );
      console.log("✅ Views count updated");
    } catch (viewsError) {
      console.warn("⚠️ Failed to update views:", viewsError.message);
      // Don't fail the request if views update fails
    }

    console.log("📤 Sending response...");
    res.json({
      success: true,
      data: {
        ...apartment,
        views: (apartment.views || 0) + 1,
      },
    });
  } catch (error) {
    console.error("❌ Get apartment by ID error:", error);
    console.error("❌ Error stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Error fetching apartment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ✅ Update apartment - FIXED (Removed duplicate and improved validation)
app.put(
  "/api/apartments/:id",
  authenticateToken,
  upload.any(),
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log("🔄 Updating apartment ID:", id);

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid apartment ID format",
        });
      }

      // Find apartment and check ownership (use lean to avoid validation issues)
      console.log("🔍 Finding apartment to update...");
      const apartment = await Apartment.findById(id).lean();

      if (!apartment) {
        return res.status(404).json({
          success: false,
          message: "Apartment not found",
        });
      }

      // Check if user owns this apartment or is admin
      if (
        apartment.owner.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own apartments",
        });
      }

      // Prepare update data
      const updateData = { ...req.body };

      // Handle new images if uploaded
      if (req.files && req.files.length > 0) {
        console.log(`📸 Adding ${req.files.length} new images`);
        const newPics = req.files.map((file) => `/uploads/${file.filename}`);
        updateData.apartment_pics = [
          ...(apartment.apartment_pics || []),
          ...newPics,
        ];
      }

      // Handle features parsing
      if (updateData.features && typeof updateData.features === "string") {
        try {
          updateData.features = JSON.parse(updateData.features);
        } catch (parseError) {
          return res.status(400).json({
            success: false,
            message: "Invalid features format - must be valid JSON",
          });
        }
      }

      // Validate title and description lengths before update
      if (updateData.title && updateData.title.length > 200) {
        return res.status(400).json({
          success: false,
          message: "Title cannot exceed 200 characters",
        });
      }

      if (updateData.description && updateData.description.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Description cannot exceed 2000 characters",
        });
      }

      // Update apartment with validation
      console.log("💾 Updating apartment in database...");
      const updatedApartment = await Apartment.findByIdAndUpdate(
        id,
        { ...updateData, updated_at: Date.now() },
        { new: true, runValidators: true }
      ).populate("owner", "name email phone");

      console.log("✅ Apartment updated successfully");

      res.json({
        success: true,
        message: "Apartment updated successfully",
        data: updatedApartment,
      });
    } catch (error) {
      console.error("❌ Update apartment error:", error);

      // Handle validation errors specifically
      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating apartment",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);
// ✅ Get user profile
app.get("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    // Count apartments (advertisements) owned by the user
    const apartmentsCount = await Apartment.countDocuments({ owner: req.user._id });
    const apartmentsInfo = `You have ${apartmentsCount} advertisement${apartmentsCount === 1 ? "" : "s"}`;

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        apartments_count: apartmentsCount,
        apartments_info: apartmentsInfo,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
});

// ✅ Create user (Admin only)
app.post(
  "/api/users",
  authenticateToken,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "national_id_pic", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const { name, email, password, role, role_id, national_id, phone } =
        req.body;

      // Basic validation
      if (!name || !email || !password || !national_id) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { national_id }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email or National ID already exists",
        });
      }

      // Handle file uploads
      const avatar = req.files?.["avatar"] ? `/uploads/${req.files["avatar"][0].filename}` : null;
      const nationalIdPic = req.files?.["national_id_pic"]
        ? `/uploads/${req.files["national_id_pic"][0].filename}`
        : null;

      // Create new user
      const newUser = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: role || "tenant",
        role_id,
        national_id,
        phone,
        avatar,
        national_id_pic: nationalIdPic,
      });

      await newUser.save();

      // Remove password from response
      const userResponse = newUser.toObject();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: userResponse,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating user",
      });
    }
  }
);
// ✅ Get all users (Admin only)
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const users = await User.find().select("-password");
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
});

// ✅ Get user by ID
app.get("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.put(
  "/api/users/profile",
  authenticateToken,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "national_id_pic", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        password,
        password_confirmation,
      } = req.body;

      const updateFields = {};

      if (name) updateFields.name = name.trim();
      if (email) updateFields.email = email.toLowerCase().trim();
      if (phone) updateFields.phone = phone.trim();

      // Handle avatar / national_id_pic uploads (if any)
      if (req.files && req.files.avatar && req.files.avatar[0]) {
        updateFields.avatar = `/uploads/${req.files.avatar[0].filename}`;
      }
      if (req.files && req.files.national_id_pic && req.files.national_id_pic[0]) {
        updateFields.national_id_pic = `/uploads/${req.files.national_id_pic[0].filename}`;
      }

      // Handle password update with confirmation & hashing
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters",
          });
        }
        if (!password_confirmation || password !== password_confirmation) {
          return res.status(400).json({
            success: false,
            message: "Password and confirmation do not match",
          });
        }

        const salt = await bcrypt.genSalt(10);
        updateFields.password = await bcrypt.hash(password, salt);
      }

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided for update",
        });
      }

      const updatedUser = await User.findByIdAndUpdate(req.user._id, updateFields, {
        new: true,
        runValidators: true,
      }).select("-password");

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating profile",
      });
    }
  }
);
app.use("/api/saved-searches", savedSearchRoutes); // Authentication handled within routes
// ✅ Static files serving
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Update user by ID (admin or owner)
app.put("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (email) updateFields.email = email.toLowerCase().trim();
    if (phone) updateFields.phone = phone.trim();

    // Only owner or admin can update
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated", data: updated });
  } catch (error) {
    console.error("Update user by ID error:", error);
    res.status(500).json({ success: false, message: "Server error updating user" });
  }
});

// ✅ Health check endpoint for EvenNode
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});
import imageRoutes from "./routes/imageRoutes.js";
app.use("/api/images", imageRoutes);

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Real Estate API is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/users/login",
      register: "/api/users/register",
      apartments: "/api/apartments",
      profile: "/api/users/profile",
      health: "/health",
    },
  });
});

// ✅ Error handling middleware
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 10 files",
      });
    }
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ✅ 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ✅ Enhanced server startup with automatic port fallback
const startServer = async () => {
  try {
    // Connect to DB first
    await connectDB();

    const basePort = parseInt(process.env.PORT, 10) || 5000;
    // 🔄 Retry indefinitely until port 5000 becomes free
    const maxAttempts = Infinity;

    const attemptListen = (port, attemptsLeft) => {
      const server = app
        .listen(port, "0.0.0.0", () => {
          console.log("🚀 =================================");
          console.log(`🚀 Server running on port ${port}`);
          console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
          console.log(`📁 Uploads directory: ${uploadsDir}`);
          console.log(`🌐 Health check: http://localhost:${port}/health`);
          console.log("🚀 =================================");
        })
        .on("error", async (err) => {
          if (err.code === "EADDRINUSE" && (attemptsLeft > 0 || attemptsLeft === Infinity)) {
            console.warn(`⚠️ Port ${port} in use. Attempting to free it...`);
            // Small delay to allow previous attempt to clean up
            await killPort(port);
            console.log('✅ Port freed. Retrying...');
            const nextAttemptsLeft = attemptsLeft === Infinity ? Infinity : attemptsLeft - 1;
        setTimeout(() => attemptListen(port, nextAttemptsLeft), 500);
          } else {
            console.error("❌ Failed to start server:", err);
            process.exit(1);
          }
        });

      // Graceful shutdown
      const gracefulShutdown = () => {
        console.log("👋 Shutting down gracefully...");
        server.close(() => {
          console.log("Process terminated");
          mongoose.connection.close();
        });
      };

      process.on("SIGTERM", gracefulShutdown);
      process.on("SIGINT", gracefulShutdown);
    };

    attemptListen(basePort, maxAttempts);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};


// ✅ Start the application
startServer();
