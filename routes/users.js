import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import userRoutes from './auth.js';
import connectDB from '../config/db.js'; // Fixed path to database connection file


dotenv.config();

const app = express();

// Connect to MongoDB
// connectDB(); // Uncomment if you have a database connection file

// مهم جداً تفعيل هذا عشان req.body ما يكون undefined
app.use(express.json()); // للـ JSON
app.use(express.urlencoded({ extended: true })); // للـ form-data

// Middleware التوثيق
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
 
  const token = authHeader.split(' ')[1]; // Bearer TOKEN
 
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// ADD THIS - Admin middleware
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

// ADD THIS - Mount user routes
app.use('/api/users', userRoutes);

// مثال على راوتر محمي
app.get('/protected', authenticate, (req, res) => {
  res.json({ message: `Hello user ${req.user.id}` });
});

// Login endpoint that matches your Postman request
app.post('/api/users/login', (req, res) => {
  console.log('Request body:', req.body); // للتتبع
  console.log('Content-Type:', req.headers['content-type']); // للتتبع
 
  const { email, password } = req.body;
 
  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password required',
      received: req.body
    });
  }
 
  // تحقق من بيانات المستخدم هنا...
  // مثال بسيط للتحقق - REPLACE WITH REAL DATABASE CHECK
  if (email === 'youssef@example.com' && password === '123456') {
    // إصدار توكن - ADD ROLE TO TOKEN
    const token = jwt.sign({ 
      id: 123, 
      email,
      role: 'admin' // ADD THIS - Important for role-based access
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({
      success: true,
      token,
      message: 'Login successful',
      user: { id: 123, email, role: 'admin' }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Keep the old /login endpoint for backwards compatibility
app.post('/login', (req, res) => {
  res.redirect(307, '/api/users/login'); // 307 preserves POST method and body
});

// إضافة endpoint للتتبع
app.post('/test', (req, res) => {
  res.json({
    body: req.body,
    headers: req.headers,
    contentType: req.headers['content-type']
  });
});

// ADD THIS - Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});
