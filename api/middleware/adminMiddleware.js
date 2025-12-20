import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';

// Middleware to verify admin access
export const verifyAdmin = async (req, res, next) => {
  try {
    // Check cookies first, then Authorization header
    let token = req.cookies.access_token || req.cookies.token;
    
    // If no cookie token, check Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return next(errorHandler(401, 'Access denied. No token provided.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(errorHandler(401, 'Access denied. User not found.'));
    }
    
    if (!user.isActive) {
      return next(errorHandler(401, 'Access denied. Account is deactivated.'));
    }
    
    // Check if user has admin privileges
    if (!['admin', 'manager'].includes(user.role)) {
      return next(errorHandler(403, 'Access denied. Admin privileges required.'));
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(errorHandler(401, 'Access denied. Token expired.'));
    } else if (error.name === 'JsonWebTokenError') {
      return next(errorHandler(401, 'Access denied. Invalid token.'));
    } else {
      return next(errorHandler(500, 'Server error during authentication.'));
    }
  }
};

// Middleware to verify manager or admin access
export const verifyManager = async (req, res, next) => {
  try {
    // Check cookies first, then Authorization header
    let token = req.cookies.access_token || req.cookies.token;
    
    // If no cookie token, check Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return next(errorHandler(401, 'Access denied. No token provided.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(errorHandler(401, 'Access denied. User not found.'));
    }
    
    if (!user.isActive) {
      return next(errorHandler(401, 'Access denied. Account is deactivated.'));
    }
    
    // Check if user has manager or admin privileges
    if (!['admin', 'manager', 'staff'].includes(user.role)) {
      return next(errorHandler(403, 'Access denied. Staff privileges required.'));
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(errorHandler(401, 'Access denied. Token expired.'));
    } else if (error.name === 'JsonWebTokenError') {
      return next(errorHandler(401, 'Access denied. Invalid token.'));
    } else {
      return next(errorHandler(500, 'Server error during authentication.'));
    }
  }
};

export default { verifyAdmin, verifyManager };