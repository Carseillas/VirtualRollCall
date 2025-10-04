// backend/middleware/validation.js - Validation Middleware
const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formattedErrors
    });
  }
  
  next();
};

/**
 * Custom validators
 */
const customValidators = {
  // Date validation (YYYY-MM-DD)
  isValidDate: (value) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;
    
    const date = new Date(value);
    return date instanceof Date && !isNaN(date);
  },

  // Not a future date
  isNotFutureDate: (value) => {
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate <= today;
  },

  // Valid email format
  isValidEmail: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  // Valid phone number
  isValidPhone: (value) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(value);
  },

  // Strong password (min 8 chars, uppercase, lowercase, number, special char)
  isStrongPassword: (value) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(value);
  },

  // Valid username (alphanumeric and underscore only)
  isValidUsername: (value) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(value);
  },

  // Valid student ID format
  isValidStudentId: (value) => {
    const studentIdRegex = /^[A-Z]{2}\d{3,6}$/;
    return studentIdRegex.test(value);
  },

  // Array of integers
  isIntegerArray: (value) => {
    if (!Array.isArray(value)) return false;
    return value.every(item => Number.isInteger(parseInt(item)));
  },

  // Valid role
  isValidRole: (value) => {
    return ['principal', 'teacher'].includes(value.toLowerCase());
  },

  // Valid grade (1-12)
  isValidGrade: (value) => {
    const grade = parseInt(value);
    return Number.isInteger(grade) && grade >= 1 && grade <= 12;
  },

  // Valid format (pdf/html)
  isValidFormat: (value) => {
    return ['pdf', 'html'].includes(value.toLowerCase());
  }
};

/**
 * Authentication Validations
 */
const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean'),
  
  handleValidationErrors
];

const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .custom(customValidators.isValidUsername)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .custom(customValidators.isStrongPassword)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('phone')
    .optional({ nullable: true })
    .trim()
    .custom(customValidators.isValidPhone)
    .withMessage('Invalid phone number format'),
  
  body('role')
    .custom(customValidators.isValidRole)
    .withMessage('Role must be either principal or teacher'),
  
  body('subjects')
    .optional()
    .isArray()
    .withMessage('Subjects must be an array')
    .custom(customValidators.isIntegerArray)
    .withMessage('Subject IDs must be integers'),
  
  handleValidationErrors
];

const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('phone')
    .optional({ nullable: true })
    .trim()
    .custom(customValidators.isValidPhone)
    .withMessage('Invalid phone number format'),
  
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .custom(customValidators.isStrongPassword)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
  
  handleValidationErrors
];

/**
 * Class Validations
 */
const validateClass = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Class name is required and must be less than 50 characters'),
  
  body('grade')
    .isInt({ min: 1, max: 12 })
    .withMessage('Grade must be between 1 and 12'),
  
  body('section')
    .optional()
    .trim()
    .isLength({ max: 5 })
    .withMessage('Section must be less than 5 characters'),
  
  body('classTeacher')
    .optional()
    .isInt()
    .withMessage('Class teacher must be a valid teacher ID'),
  
  body('maxStudents')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Maximum students must be between 1 and 50'),
  
  body('students')
    .optional()
    .isArray()
    .withMessage('Students must be an array'),
  
  body('students.*.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Student name must be between 2 and 100 characters'),
  
  body('students.*.studentId')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Student ID must be between 3 and 20 characters'),
  
  body('students.*.email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('Invalid student email format'),
  
  handleValidationErrors
];

const validateClassId = [
  param('id')
    .isInt()
    .withMessage('Class ID must be a valid integer'),
  
  handleValidationErrors
];

const validateStudent = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Student name must be between 2 and 100 characters'),
  
  body('studentId')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Student ID must be between 3 and 20 characters'),
  
  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('dateOfBirth')
    .optional({ nullable: true })
    .custom(customValidators.isValidDate)
    .withMessage('Invalid date format (use YYYY-MM-DD)'),
  
  body('parentContact')
    .optional({ nullable: true })
    .trim()
    .custom(customValidators.isValidPhone)
    .withMessage('Invalid phone number format'),
  
  handleValidationErrors
];

/**
 * Attendance Validations
 */
const validateAttendance = [
  body('classId')
    .isInt()
    .withMessage('Class ID must be a valid integer'),
  
  body('subjectId')
    .isInt()
    .withMessage('Subject ID must be a valid integer'),
  
  body('date')
    .custom(customValidators.isValidDate)
    .withMessage('Invalid date format (use YYYY-MM-DD)')
    .custom(customValidators.isNotFutureDate)
    .withMessage('Cannot take attendance for future dates'),
  
  body('absentStudents')
    .optional()
    .isArray()
    .withMessage('Absent students must be an array')
    .custom(customValidators.isIntegerArray)
    .withMessage('Student IDs must be integers'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  
  handleValidationErrors
];

const validateAttendanceId = [
  param('id')
    .isInt()
    .withMessage('Attendance record ID must be a valid integer'),
  
  handleValidationErrors
];

const validateAttendanceQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('classId')
    .optional()
    .isInt()
    .withMessage('Class ID must be a valid integer'),
  
  query('subjectId')
    .optional()
    .isInt()
    .withMessage('Subject ID must be a valid integer'),
  
  query('teacherId')
    .optional()
    .isInt()
    .withMessage('Teacher ID must be a valid integer'),
  
  query('date')
    .optional()
    .custom(customValidators.isValidDate)
    .withMessage('Invalid date format (use YYYY-MM-DD)'),
  
  query('startDate')
    .optional()
    .custom(customValidators.isValidDate)
    .withMessage('Invalid start date format (use YYYY-MM-DD)'),
  
  query('endDate')
    .optional()
    .custom(customValidators.isValidDate)
    .withMessage('Invalid end date format (use YYYY-MM-DD)'),
  
  handleValidationErrors
];

const validateBulkAttendance = [
  body('attendanceRecords')
    .isArray({ min: 1 })
    .withMessage('Attendance records array is required and must not be empty'),
  
  body('attendanceRecords.*.classId')
    .isInt()
    .withMessage('Each record must have a valid class ID'),
  
  body('attendanceRecords.*.subjectId')
    .isInt()
    .withMessage('Each record must have a valid subject ID'),
  
  body('attendanceRecords.*.date')
    .custom(customValidators.isValidDate)
    .withMessage('Each record must have a valid date (YYYY-MM-DD)'),
  
  body('attendanceRecords.*.absentStudents')
    .optional()
    .isArray()
    .withMessage('Absent students must be an array'),
  
  handleValidationErrors
];

/**
 * Subject Validations
 */
const validateSubject = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject name must be between 2 and 100 characters'),
  
  body('code')
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage('Subject code must be between 2 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Subject code must contain only uppercase letters and numbers'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  handleValidationErrors
];

const validateSubjectId = [
  param('id')
    .isInt()
    .withMessage('Subject ID must be a valid integer'),
  
  handleValidationErrors
];

/**
 * Schedule Validations
 */
const validateSchedule = [
  body('teacherId')
    .isInt()
    .withMessage('Teacher ID must be a valid integer'),
  
  body('classId')
    .isInt()
    .withMessage('Class ID must be a valid integer'),
  
  body('subjectId')
    .isInt()
    .withMessage('Subject ID must be a valid integer'),
  
  body('dayOfWeek')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day of week'),
  
  body('startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid time format (use HH:MM)'),
  
  body('endTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid time format (use HH:MM)'),
  
  body('room')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Room must be less than 50 characters'),
  
  handleValidationErrors
];

/**
 * Report Validations
 */
const validateReportGeneration = [
  body('classId')
    .isInt()
    .withMessage('Class ID must be a valid integer'),
  
  body('startDate')
    .custom(customValidators.isValidDate)
    .withMessage('Invalid start date format (use YYYY-MM-DD)'),
  
  body('endDate')
    .custom(customValidators.isValidDate)
    .withMessage('Invalid end date format (use YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      return endDate >= req.body.startDate;
    })
    .withMessage('End date must be after or equal to start date'),
  
  body('subjectId')
    .optional()
    .isInt()
    .withMessage('Subject ID must be a valid integer'),
  
  body('format')
    .optional()
    .custom(customValidators.isValidFormat)
    .withMessage('Format must be either pdf or html'),
  
  handleValidationErrors
];

const validateReportFilename = [
  param('filename')
    .matches(/^attendance_[a-zA-Z0-9_\-]+\.pdf$/)
    .withMessage('Invalid report filename'),
  
  handleValidationErrors
];

/**
 * Query Parameter Validations
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateDateRange = [
  query('startDate')
    .optional()
    .custom(customValidators.isValidDate)
    .withMessage('Invalid start date format (use YYYY-MM-DD)'),
  
  query('endDate')
    .optional()
    .custom(customValidators.isValidDate)
    .withMessage('Invalid end date format (use YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        return endDate >= req.query.startDate;
      }
      return true;
    })
    .withMessage('End date must be after or equal to start date'),
  
  handleValidationErrors
];

/**
 * ID Parameter Validations
 */
const validateUserId = [
  param('id')
    .isInt()
    .withMessage('User ID must be a valid integer'),
  
  handleValidationErrors
];

const validateStudentId = [
  param('studentId')
    .isInt()
    .withMessage('Student ID must be a valid integer'),
  
  handleValidationErrors
];

/**
 * Sanitization helpers
 */
const sanitizeInput = {
  // Remove HTML tags
  stripHtml: (value) => {
    return value.replace(/<[^>]*>/g, '');
  },

  // Escape special characters
  escapeHtml: (value) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return value.replace(/[&<>"'/]/g, (char) => map[char]);
  },

  // Normalize whitespace
  normalizeWhitespace: (value) => {
    return value.replace(/\s+/g, ' ').trim();
  }
};

/**
 * Custom validation middleware creator
 */
const createValidator = (schema) => {
  return [
    ...schema,
    handleValidationErrors
  ];
};

module.exports = {
  // Validation middleware
  handleValidationErrors,
  
  // Authentication validations
  validateLogin,
  validateRegistration,
  validateProfileUpdate,
  validatePasswordChange,
  
  // Class validations
  validateClass,
  validateClassId,
  validateStudent,
  
  // Attendance validations
  validateAttendance,
  validateAttendanceId,
  validateAttendanceQuery,
  validateBulkAttendance,
  
  // Subject validations
  validateSubject,
  validateSubjectId,
  
  // Schedule validations
  validateSchedule,
  
  // Report validations
  validateReportGeneration,
  validateReportFilename,
  
  // Query validations
  validatePagination,
  validateSearch,
  validateDateRange,
  
  // ID validations
  validateUserId,
  validateStudentId,
  
  // Utilities
  customValidators,
  sanitizeInput,
  createValidator
};