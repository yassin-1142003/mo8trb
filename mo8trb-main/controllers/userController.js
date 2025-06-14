import User from '../models/User.js';
import bcrypt from 'bcrypt';

// GET Profile - Get current user's profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST - Create User (Admin Only)
export const createUser = async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Username, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role
    });

    await newUser.save();

    // Return user without password
    const userResponse = await User.findById(newUser._id).select('-password');
    res.status(201).json(userResponse);
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET - Get All Users (improved with pagination and search)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build query object
    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page * limit < totalUsers,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET - Get User by ID (improved with error handling)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT - Update User (improved with validation)
export const updateUser = async (req, res) => {
  try {
    const { password, role, ...updateData } = req.body;
    
    // Only allow admins to change roles
    if (role && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Only admins can change user roles' 
      });
    }
    
    // Users can only update their own profile unless they're admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. You can only update your own profile.' 
      });
    }

    // If password is being updated, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Add role if admin is updating
    if (role && req.user.role === 'admin') {
      updateData.role = role;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'Username or email already exists' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE - Delete User (improved with restrictions)
export const deleteUser = async (req, res) => {
  try {
    // Prevent users from deleting themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({ 
        message: 'You cannot delete your own account' 
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};