
import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Invalid token format. Use: Bearer <token>' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided after Bearer' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token', error: err.message });
  }
};

// Admin-only middleware
export const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Authorization error' });
  }
};

// Check ownership or admin
export const checkOwnershipOrAdmin = (req, res, next) => {
  try {
    const userId = req.params.id;

    if (req.user.role === 'admin' || req.user.id === parseInt(userId)) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied. You can only access your own resources.' });
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ message: 'Authorization error' });
  }
};
