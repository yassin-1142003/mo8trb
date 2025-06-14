import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Standalone authenticateToken middleware extracted from server.js
export default async function authenticateToken(req, res, next) {
  try {
    const authHeader =
      req.headers["authorization"] || req.headers["x-access-token"];

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

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Determine userId field in token
    const userId = decoded._id || decoded.id;

    // Validate ObjectId format; some legacy tokens may embed numeric IDs which are not ObjectIds
    if (!userId || (typeof userId === "string" && userId.length === 24 && !/^[a-fA-F0-9]{24}$/.test(userId))) {
      return res.status(403).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // Fetch user from DB (skip DB lookup if id clearly not an ObjectId)
    const user = typeof userId === "string" && userId.match(/^[a-fA-F0-9]{24}$/)
      ? await User.findById(userId).select("-password").lean()
      : null;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Inactive/banned user check
    if (typeof user.status !== "undefined" && user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User is inactive or banned",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Fallback for other errors
    res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
}
