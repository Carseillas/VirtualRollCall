// backend/middleware/auth.js - Authentication Middleware
const jwt = require('jsonwebtoken');
const { findUserById, updateUser } = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (user, options = {}) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
    subjects: user.subjects || [],
    iat: Math.floor(Date.now() / 1000)
  };

  const defaultOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    issuer: 'VirtualRollCall',
    audience: 'VirtualRollCall-Users'
  };

  return jwt.sign(payload, JWT_SECRET, { ...defaultOptions, ...options });
};

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED',
        message: 'Please provide a valid authentication token'
      });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        let errorResponse = {
          error: 'Invalid token',
          code: 'TOKEN_INVALID'
        };

        if (err.name === 'TokenExpiredError') {
          errorResponse = {
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
            message: 'Your session has expired. Please login again.'
          };
        }

        return res.status(401).json(errorResponse);
      }

      // Verify user still exists and is active
      const user = findUserById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'User not found or inactive',
          code: 'USER_INACTIVE'
        });
      }

      // Add user info to request
      req.user = {
        ...decoded,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      };

      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  if (!Array.isArray(allowedRoles)) {
    allowedRoles = [allowedRoles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Principal-only middleware
const requirePrincipal = requireRole(['principal']);

// Teacher or Principal middleware
const requireTeacherOrPrincipal = requireRole(['teacher', 'principal']);

// Rate limiting for authentication attempts
const createAuthRateLimit = (windowMs = 15 * 60 * 1000, maxAttempts = 5) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + ':' + (req.body.username || '');
    const now = Date.now();
    const windowStart = now - windowMs;

    const userAttempts = attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(timestamp => timestamp > windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const timeUntilReset = Math.ceil((Math.min(...recentAttempts) + windowMs - now) / 60000);
      return res.status(429).json({
        error: 'Too many login attempts',
        code: 'RATE_LIMITED',
        retryAfter: timeUntilReset
      });
    }

    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode === 401) {
        recentAttempts.push(now);
        attempts.set(key, recentAttempts);
      } else if (res.statusCode === 200) {
        attempts.delete(key);
      }
      originalSend.call(this, data);
    };

    next();
  };
};

// Update user's last activity
const updateLastActivity = async (req, res, next) => {
  if (req.user && req.user.id) {
    try {
      updateUser(req.user.id, { 
        lastActivity: new Date().toISOString(),
        lastIP: req.ip
      });
    } catch (error) {
      console.warn('Failed to update user activity:', error);
    }
  }
  next();
};

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  requirePrincipal,
  requireTeacherOrPrincipal,
  createAuthRateLimit,
  updateLastActivity,
  JWT_SECRET
};