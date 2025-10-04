const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't return password by default in queries
  },
  role: {
    type: String,
    enum: {
      values: ['principal', 'teacher', 'student'],
      message: 'Role must be either principal, teacher, or student'
    },
    required: [true, 'Role is required']
  },
  employeeId: {
    type: String,
    sparse: true, // Allows multiple null values
    unique: true,
    trim: true
  },
  studentId: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  profilePicture: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // For teachers - subjects they teach
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  // For teachers - classes they teach
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  // For students - class they belong to
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  // For students - roll number in their class
  rollNumber: {
    type: Number,
    default: null
  },
  // For students - parent/guardian information
  parentInfo: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10,15}$/, 'Please provide a valid parent phone number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid parent email']
    },
    relation: {
      type: String,
      trim: true
    }
  },
  // Password reset functionality
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  // Account creation and modification tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ employeeId: 1 }, { sparse: true });
userSchema.index({ studentId: 1 }, { sparse: true });
userSchema.index({ class: 1 });

// Virtual for full profile based on role
userSchema.virtual('roleSpecificInfo').get(function() {
  if (this.role === 'teacher') {
    return {
      employeeId: this.employeeId,
      subjects: this.subjects,
      classes: this.classes
    };
  } else if (this.role === 'student') {
    return {
      studentId: this.studentId,
      class: this.class,
      rollNumber: this.rollNumber,
      parentInfo: this.parentInfo
    };
  } else if (this.role === 'principal') {
    return {
      employeeId: this.employeeId
    };
  }
  return null;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set employee/student IDs based on role
userSchema.pre('save', function(next) {
  if (this.isNew) {
    if (this.role === 'teacher' || this.role === 'principal') {
      if (!this.employeeId) {
        // Auto-generate employee ID if not provided
        this.employeeId = `EMP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      }
    } else if (this.role === 'student') {
      if (!this.studentId) {
        // Auto-generate student ID if not provided
        this.studentId = `STU${Date.now()}${Math.floor(Math.random() * 1000)}`;
      }
    }
  }
  next();
});

// Instance method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate password reset token
userSchema.methods.generateResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
  return resetToken;
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
};

// Static method to find user by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email }).select('+password');
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const isPasswordMatch = await user.comparePassword(password);
  
  if (!isPasswordMatch) {
    throw new Error('Invalid email or password');
  }

  return user;
};

// Static method to get teachers with their subjects and classes
userSchema.statics.getTeachersWithDetails = async function() {
  return await this.find({ role: 'teacher', isActive: true })
    .populate('subjects', 'name code')
    .populate('classes', 'name section grade')
    .select('-password');
};

// Static method to get students by class
userSchema.statics.getStudentsByClass = async function(classId) {
  return await this.find({ 
    role: 'student', 
    class: classId,
    isActive: true 
  })
  .select('-password')
  .sort({ rollNumber: 1 });
};

// Static method to check if email already exists
userSchema.statics.isEmailTaken = async function(email, excludeUserId = null) {
  const user = await this.findOne({ 
    email,
    ...(excludeUserId && { _id: { $ne: excludeUserId } })
  });
  return !!user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;