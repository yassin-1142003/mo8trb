import express from "express";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import multer from "multer";

import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import apartmentRoutes from "./routes/apartments.js";
import imageRoutes from "./routes/imageRoutes.js";
import savedSearchRoutes from "./routes/savedSearchRoutes.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import { uploadsDir } from "./utils/uploadsDir.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
app.use("/api/auth", authRoutes); // login, register
app.use("/api/users", userRoutes);
app.use("/api/apartments", apartmentRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/saved-searches", savedSearchRoutes);

// ✅ Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Real Estate API is running!",
    version: "1.0.0",
  });
});

// ✅ Error handling
app.use(errorHandler);
app.use(notFound);

// ✅ Start server
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Shutting down...");
      server.close(() => mongoose.connection.close());
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received. Shutting down...");
      server.close(() => mongoose.connection.close());
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
