import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Apartment from '../models/Apartment.js';

// Basic Authentication Middleware
export const authenticate = async (req, res, next) => {
  let token = null;
 
  try {
    // Try multiple methods to get the token
    if (req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '').trim();
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    } else if (req.query.token) {
      token = req.query.token;
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
 
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided' 
      });
    }
 
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure user still exists and is active
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Token is valid but user no longer exists' 
      });
    }

    if (user.status === 'inactive' || user.status === 'banned') {
      return res.status(401).json({ 
        success: false,
        message: 'Account has been deactivated' 
      });
    }
 
    req.user = user;
    next();
  } catch (err) {
    console.log('Authentication error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token has expired' 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during authentication' 
    });
  }
};

// Role-based Authorization Middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// Check if user owns the apartment
export const checkApartmentOwnership = async (req, res, next) => {
  try {
    const apartmentId = req.params.id || req.params.apartmentId || req.body.apartmentId;
    
    if (!apartmentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Apartment ID is required' 
      });
    }

    const apartment = await Apartment.findById(apartmentId);
    
    if (!apartment) {
      return res.status(404).json({ 
        success: false,
        message: 'Apartment not found' 
      });
    }

    // Check if user owns the apartment or is an admin
    if (apartment.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only manage your own apartments' 
      });
    }

    req.apartment = apartment;
    next();
  } catch (error) {
    console.log('Apartment ownership check error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error checking apartment ownership' 
    });
  }
};

// Validate apartment data middleware
export const validateApartmentData = (req, res, next) => {
  const { title, description, price, location, bedrooms, bathrooms, area } = req.body;
  const errors = [];

  // Required fields validation
  if (!title || title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters long');
  }

  if (!description || description.trim().length < 10) {
    errors.push('Description is required and must be at least 10 characters long');
  }

  if (!price || isNaN(price) || price <= 0) {
    errors.push('Valid price is required and must be greater than 0');
  }

  if (!location || !location.address) {
    errors.push('Location with address is required');
  }

  if (!bedrooms || isNaN(bedrooms) || bedrooms < 0) {
    errors.push('Valid number of bedrooms is required');
  }

  if (!bathrooms || isNaN(bathrooms) || bathrooms < 0) {
    errors.push('Valid number of bathrooms is required');
  }

  if (!area || isNaN(area) || area <= 0) {
    errors.push('Valid area is required and must be greater than 0');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed',
      errors 
    });
  }

  next();
};

// Check apartment availability for booking
export const checkApartmentAvailability = async (req, res, next) => {
  try {
    const { apartmentId, checkIn, checkOut } = req.body;
    
    if (!apartmentId || !checkIn || !checkOut) {
      return res.status(400).json({ 
        success: false,
        message: 'Apartment ID, check-in and check-out dates are required' 
      });
    }

    const apartment = await Apartment.findById(apartmentId);
    
    if (!apartment) {
      return res.status(404).json({ 
        success: false,
        message: 'Apartment not found' 
      });
    }

    if (apartment.status !== 'available') {
      return res.status(400).json({ 
        success: false,
        message: 'Apartment is not available for booking' 
      });
    }

    // Check date validity
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return res.status(400).json({ 
        success: false,
        message: 'Check-in date cannot be in the past' 
      });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Check-out date must be after check-in date' 
      });
    }

    // Here you would typically check for existing bookings
    // const existingBookings = await Booking.find({
    //   apartment: apartmentId,
    //   status: { $in: ['confirmed', 'pending'] },
    //   $or: [
    //     { checkIn: { $lt: checkOutDate, $gte: checkInDate } },
    //     { checkOut: { $gt: checkInDate, $lte: checkOutDate } },
    //     { checkIn: { $lte: checkInDate }, checkOut: { $gte: checkOutDate } }
    //   ]
    // });

    // if (existingBookings.length > 0) {
    //   return res.status(400).json({ 
    //     success: false,
    //     message: 'Apartment is not available for the selected dates' 
    //   });
    // }

    req.apartment = apartment;
    req.bookingDates = { checkInDate, checkOutDate };
    next();
  } catch (error) {
    console.log('Availability check error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error checking apartment availability' 
    });
  }
};

// Rate limiting middleware for apartment operations
export const rateLimitApartmentOperations = (req, res, next) => {
  // Simple in-memory rate limiting (use Redis in production)
  const userOperations = global.userOperations || {};
  const userId = req.user._id.toString();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxOperations = 50; // Max 50 operations per 15 minutes

  if (!userOperations[userId]) {
    userOperations[userId] = [];
  }

  // Remove old operations outside the window
  userOperations[userId] = userOperations[userId].filter(
    timestamp => now - timestamp < windowMs
  );

  if (userOperations[userId].length >= maxOperations) {
    return res.status(429).json({ 
      success: false,
      message: 'Too many requests. Please try again later.' 
    });
  }

  userOperations[userId].push(now);
  global.userOperations = userOperations;
  
  next();
};

// Logging middleware for apartment operations
export const logApartmentOperation = (operation) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the operation
      console.log(`[${new Date().toISOString()}] ${operation}:`, {
        userId: req.user?._id,
        userEmail: req.user?.email,
        apartmentId: req.params.id || req.params.apartmentId || req.body.apartmentId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        statusCode: res.statusCode
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// File upload validation for apartment images
export const validateApartmentImages = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ 
      success: false,
      message: 'At least one image is required' 
    });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const maxFiles = 10;

  if (req.files.length > maxFiles) {
    return res.status(400).json({ 
      success: false,
      message: `Maximum ${maxFiles} images allowed` 
    });
  }

  for (const file of req.files) {
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        success: false,
        message: 'Only JPEG, PNG, and WebP images are allowed' 
      });
    }

    if (file.size > maxSize) {
      return res.status(400).json({ 
        success: false,
        message: 'Each image must be less than 5MB' 
      });
    }
  }

  next();
};

// Combined middleware for common apartment operations
export const apartmentMiddleware = {
  // For creating apartments
  create: [
    authenticate,
    authorize('owner', 'admin'),
    validateApartmentData,
    rateLimitApartmentOperations,
    logApartmentOperation('CREATE_APARTMENT')
  ],
  
  // For updating apartments
  update: [
    authenticate,
    authorize('owner', 'admin'),
    checkApartmentOwnership,
    validateApartmentData,
    rateLimitApartmentOperations,
    logApartmentOperation('UPDATE_APARTMENT')
  ],
  
  // For deleting apartments
  delete: [
    authenticate,
    authorize('owner', 'admin'),
    checkApartmentOwnership,
    logApartmentOperation('DELETE_APARTMENT')
  ],
  
  // For viewing single apartment (public)
  view: [
    logApartmentOperation('VIEW_APARTMENT')
  ],
  
  // For managing apartments (owner only)
  manage: [
    authenticate,
    authorize('owner', 'admin'),
    checkApartmentOwnership,
    logApartmentOperation('MANAGE_APARTMENT')
  ],
  
  // For booking apartments
  book: [
    authenticate,
    authorize('tenant', 'owner', 'admin'),
    checkApartmentAvailability,
    rateLimitApartmentOperations,
    logApartmentOperation('BOOK_APARTMENT')
  ],
  
  // For uploading apartment images
  uploadImages: [
    authenticate,
    authorize('owner', 'admin'),
    checkApartmentOwnership,
    validateApartmentImages,
    logApartmentOperation('UPLOAD_APARTMENT_IMAGES')
  ]
};