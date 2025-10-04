const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, restrictTo } = require('../middleware/auth');
const { 
  validateRegister, 
  validateLogin, 
  validatePasswordReset,
  validatePasswordChange 
} = require('../middleware/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Principal only can create users)
 * @access  Private (Principal only)
 */
router.post(
  '/register',
  auth,
  restrictTo('principal'),
  validateRegister,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post(
  '/login',
  validateLogin,
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (clear token on client side mainly)
 * @access  Private
 */
router.post(
  '/logout',
  auth,
  authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user details
 * @access  Private
 */
router.get(
  '/me',
  auth,
  authController.getMe
);

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile (name, phone, address, etc.)
 * @access  Private
 */
router.put(
  '/update-profile',
  auth,
  authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  '/change-password',
  auth,
  validatePasswordChange,
  authController.changePassword
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset token to user's email
 * @access  Public
 */
router.post(
  '/forgot-password',
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 */
router.post(
  '/reset-password/:token',
  validatePasswordReset,
  authController.resetPassword
);

/**
 * @route   PUT /api/auth/upload-profile-picture
 * @desc    Upload or update profile picture
 * @access  Private
 */
router.put(
  '/upload-profile-picture',
  auth,
  authController.uploadProfilePicture
);

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify if token is valid
 * @access  Private
 */
router.get(
  '/verify-token',
  auth,
  authController.verifyToken
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post(
  '/refresh-token',
  auth,
  authController.refreshToken
);

/**
 * @route   PUT /api/auth/deactivate/:userId
 * @desc    Deactivate a user account (Principal only)
 * @access  Private (Principal only)
 */
router.put(
  '/deactivate/:userId',
  auth,
  restrictTo('principal'),
  authController.deactivateUser
);

/**
 * @route   PUT /api/auth/activate/:userId
 * @desc    Activate a user account (Principal only)
 * @access  Private (Principal only)
 */
router.put(
  '/activate/:userId',
  auth,
  restrictTo('principal'),
  authController.activateUser
);

/**
 * @route   DELETE /api/auth/delete/:userId
 * @desc    Delete a user account permanently (Principal only)
 * @access  Private (Principal only)
 */
router.delete(
  '/delete/:userId',
  auth,
  restrictTo('principal'),
  authController.deleteUser
);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users with filtering (Principal only)
 * @access  Private (Principal only)
 */
router.get(
  '/users',
  auth,
  restrictTo('principal'),
  authController.getAllUsers
);

/**
 * @route   GET /api/auth/users/:userId
 * @desc    Get single user by ID
 * @access  Private (Principal and Teachers can view)
 */
router.get(
  '/users/:userId',
  auth,
  restrictTo('principal', 'teacher'),
  authController.getUserById
);

/**
 * @route   PUT /api/auth/users/:userId
 * @desc    Update user by ID (Principal only)
 * @access  Private (Principal only)
 */
router.put(
  '/users/:userId',
  auth,
  restrictTo('principal'),
  authController.updateUser
);

/**
 * @route   GET /api/auth/teachers
 * @desc    Get all teachers
 * @access  Private (Principal and Teachers)
 */
router.get(
  '/teachers',
  auth,
  restrictTo('principal', 'teacher'),
  authController.getAllTeachers
);

/**
 * @route   GET /api/auth/students
 * @desc    Get all students (with optional class filter)
 * @access  Private
 */
router.get(
  '/students',
  auth,
  authController.getAllStudents
);

/**
 * @route   POST /api/auth/bulk-register
 * @desc    Bulk register users (from CSV/Excel upload)
 * @access  Private (Principal only)
 */
router.post(
  '/bulk-register',
  auth,
  restrictTo('principal'),
  authController.bulkRegister
);

/**
 * @route   GET /api/auth/stats
 * @desc    Get user statistics (total users, by role, active/inactive)
 * @access  Private (Principal only)
 */
router.get(
  '/stats',
  auth,
  restrictTo('principal'),
  authController.getUserStats
);

module.exports = router;