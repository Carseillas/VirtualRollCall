// backend/controllers/authController.js - Authentication Controller
const bcrypt = require('bcryptjs');
const {
  findUser,
  findUserById,
  updateUser,
  updateUserLoginInfo,
  createUser,
  getDatabase
} = require('../utils/database');
const { generateToken } = require('../middleware/auth');

/**
 * User login
 */
const login = async (req, res) => {
  try {
    const { username, password, rememberMe = false } = req.body;

    // Validate input
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Valid username is required (minimum 3 characters)',
        code: 'INVALID_USERNAME'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Valid password is required (minimum 6 characters)',
        code: 'INVALID_PASSWORD'
      });
    }

    // Find user
    const user = findUser({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate token
    const tokenExpiry = rememberMe ? '30d' : '8h';
    const token = generateToken(user, { expiresIn: tokenExpiry });

    // Update login info
    updateUserLoginInfo(user.id);

    // Prepare user data (exclude password)
    const userData = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      subjects: user.subjects || [],
      isActive: user.isActive,
      lastLogin: new Date().toISOString()
    };

    console.log(`✅ Login: ${user.name} (${user.role}) from ${req.ip}`);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: userData,
      expiresIn: tokenExpiry
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * User logout
 */
const logout = async (req, res) => {
  try {
    console.log(`🔓 Logout: ${req.user.name} (${req.user.role})`);

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = findUserById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      subjects: user.subjects || [],
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate input
    const errors = [];
    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      errors.push('Name must be at least 2 characters');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }
    if (phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(phone)) {
      errors.push('Invalid phone format');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // Check if email is already taken
    if (email) {
      const existingUser = findUser({ email: email.toLowerCase().trim() });
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({
          success: false,
          error: 'Email address is already in use',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // Update user
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone) updateData.phone = phone.trim();

    const updatedUser = updateUser(req.user.id, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      subjects: updatedUser.subjects || []
    };

    console.log(`👤 Profile updated: ${updatedUser.name}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password',
        code: 'SAME_PASSWORD'
      });
    }

    // Get current user
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    updateUser(req.user.id, {
      password: hashedNewPassword,
      passwordChangedAt: new Date().toISOString()
    });

    console.log(`🔐 Password changed: ${user.name}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
};

/**
 * Verify token validity
 */
const verifyToken = async (req, res) => {
  try {
    const user = findUserById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        valid: false,
        error: 'Token is invalid or user is inactive',
        code: 'TOKEN_INVALID'
      });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      valid: false,
      error: 'Token verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
};

/**
 * Register new user (Principal only)
 */
const register = async (req, res) => {
  try {
    const { username, password, name, email, phone, role, subjects } = req.body;

    // Validate required fields
    const errors = [];
    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!name || name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email is required');
    }
    if (!role || !['teacher', 'principal'].includes(role)) {
      errors.push('Role must be teacher or principal');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // Check if user already exists
    const existingUser = findUser({ username: username.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists',
        code: 'USERNAME_EXISTS'
      });
    }

    const existingEmail = findUser({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // Create user
    const userData = {
      username: username.toLowerCase().trim(),
      password,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      role,
      subjects: role === 'teacher' ? (subjects || []) : []
    };

    const newUser = await createUser(userData);

    const responseUser = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      subjects: newUser.subjects || [],
      isActive: newUser.isActive
    };

    console.log(`👤 User created: ${newUser.name} (${newUser.role}) by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      user: responseUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
};

/**
 * Get all users (Principal only)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, active } = req.query;
    const database = getDatabase();

    let users = database.users.filter(user => {
      if (role && user.role !== role) return false;
      if (active !== undefined && user.isActive !== (active === 'true')) return false;
      if (search) {
        const searchTerm = search.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchTerm) ||
          user.username.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
        );
      }
      return true;
    });

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const paginatedUsers = users.slice(startIndex, endIndex);

    // Remove sensitive data
    const safeUsers = paginatedUsers.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      subjects: user.subjects || [],
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      createdAt: user.createdAt
    }));

    res.json({
      success: true,
      data: safeUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: users.length,
        pages: Math.ceil(users.length / limitNum),
        hasNext: endIndex < users.length,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
      code: 'USERS_FETCH_ERROR'
    });
  }
};

/**
 * Update user (Principal only)
 */
const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, subjects, isActive } = req.body;

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    const user = findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent self-deactivation
    if (userId === req.user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account',
        code: 'SELF_DEACTIVATION'
      });
    }

    // Check email conflict
    if (email && email !== user.email) {
      const existingUser = findUser({ email: email.toLowerCase().trim() });
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // Update user
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (role !== undefined && ['teacher', 'principal'].includes(role)) updateData.role = role;
    if (subjects !== undefined && Array.isArray(subjects)) updateData.subjects = subjects;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedUser = updateUser(userId, updateData);

    const responseUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      subjects: updatedUser.subjects || [],
      isActive: updatedUser.isActive
    };

    console.log(`👤 User updated: ${updatedUser.name} by ${req.user.name}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: responseUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      code: 'USER_UPDATE_ERROR'
    });
  }
};

/**
 * Deactivate user (Principal only)
 */
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account',
        code: 'SELF_DEACTIVATION'
      });
    }

    const user = findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Deactivate user
    updateUser(userId, {
      isActive: false,
      deactivatedAt: new Date().toISOString(),
      deactivatedBy: req.user.id
    });

    console.log(`🚫 User deactivated: ${user.name} by ${req.user.name}`);

    res.json({
      success: true,
      message: `User ${user.name} has been deactivated`
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user',
      code: 'DEACTIVATE_ERROR'
    });
  }
};

module.exports = {
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken,
  register,
  getAllUsers,
  updateUserById,
  deactivateUser
};