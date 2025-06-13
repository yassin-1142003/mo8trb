// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

// Authentication middleware
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }
 
  const token = authHeader.split(' ')[1]; // Bearer TOKEN
 
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// Admin-only middleware
export const requireAdmin = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }
    
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      message: 'Authorization error'
    });
  }
};

// Optional: Check if user can access their own resource or is admin
export const checkOwnershipOrAdmin = (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Allow access if user is admin or accessing their own resource
    if (req.user.role === 'admin' || req.user.id === parseInt(userId)) {
      return next();
    }
    
    return res.status(403).json({
      message: 'Access denied. You can only access your own resources.'
    });
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({
      message: 'Authorization error'
    });
  }
};