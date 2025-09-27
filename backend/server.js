// backend/server.js - Main Server File
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const reportRoutes = require('./routes/reports');
const subjectRoutes = require('./routes/subjects');
const scheduleRoutes = require('./routes/schedule');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Import services
const socketService = require('./services/socketService');
const { initializeDatabase } = require('./utils/database');

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_ORIGINS || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMITED'
  }
});
app.use('/api', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = process.env.SOCKET_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/reports', express.static(path.join(__dirname, 'reports')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', authenticateToken, classRoutes);
app.use('/api/subjects', authenticateToken, subjectRoutes);
app.use('/api/schedule', authenticateToken, scheduleRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'VirtualRollCall API',
    version: '1.0.0',
    description: 'Complete attendance management system for schools',
    documentation: 'https://github.com/your-repo/virtualrollcall/docs',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'User authentication',
        'POST /api/auth/logout': 'User logout',
        'GET /api/auth/me': 'Get current user info',
        'PUT /api/auth/profile': 'Update user profile',
        'GET /api/auth/verify': 'Verify token validity'
      },
      classes: {
        'GET /api/classes': 'Get all classes',
        'POST /api/classes': 'Create new class (Principal only)',
        'GET /api/classes/:id': 'Get specific class details',
        'PUT /api/classes/:id': 'Update class (Principal only)',
        'DELETE /api/classes/:id': 'Delete class (Principal only)',
        'GET /api/classes/:id/students': 'Get class students',
        'POST /api/classes/:id/students': 'Add student to class'
      },
      subjects: {
        'GET /api/subjects': 'Get all subjects',
        'POST /api/subjects': 'Create new subject (Principal only)',
        'PUT /api/subjects/:id': 'Update subject (Principal only)',
        'DELETE /api/subjects/:id': 'Delete subject (Principal only)'
      },
      schedule: {
        'GET /api/schedule': 'Get schedules with filters',
        'POST /api/schedule': 'Create new schedule (Principal only)',
        'GET /api/schedule/teacher/:id': 'Get teacher schedule',
        'PUT /api/schedule/:id': 'Update schedule (Principal only)',
        'DELETE /api/schedule/:id': 'Delete schedule (Principal only)'
      },
      attendance: {
        'POST /api/attendance': 'Submit attendance record',
        'GET /api/attendance/:classId/:date': 'Get attendance for specific class and date',
        'GET /api/attendance/history': 'Get attendance history with filters',
        'PUT /api/attendance/:id': 'Update attendance record',
        'DELETE /api/attendance/:id': 'Delete attendance record'
      },
      reports: {
        'POST /api/reports/generate': 'Generate attendance report',
        'GET /api/reports/download/:filename': 'Download generated report',
        'GET /api/reports': 'List available reports',
        'DELETE /api/reports/:filename': 'Delete report file'
      }
    },
    socket_events: {
      'connection': 'Client connects',
      'joinRoom': 'Join specific room (class/subject)',
      'leaveRoom': 'Leave specific room',
      'attendanceUpdated': 'Real-time attendance updates',
      'scheduleChanged': 'Schedule modifications',
      'userOnline': 'User comes online',
      'userOffline': 'User goes offline'
    },
    status: {
      database: 'Connected',
      socket: 'Active',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Initialize Socket.IO
socketService.initialize(io);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Create necessary directories
    const dirs = ['reports', 'public/uploads', 'templates'];
    for (const dir of dirs) {
      const dirPath = path.join(__dirname, dir);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
    
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log('\n🚀 VirtualRollCall Server Started Successfully!');
      console.log('=================================================');
      console.log(`📍 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`💾 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`⚡ Socket.IO: Ready for real-time updates`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n🔧 Development Features:');
        console.log('   • Hot reload enabled with nodemon');
        console.log('   • Detailed error messages');
        console.log('   • CORS enabled for localhost:3000');
        console.log('   • Higher rate limits for development');
        console.log('   • Sample data pre-loaded');
      }
      
      console.log('\n📋 Demo Credentials:');
      console.log('   👩‍💼 Principal: admin / admin123');
      console.log('   👩‍🏫 Teacher 1: teacher1 / teacher123');
      console.log('   👨‍🏫 Teacher 2: teacher2 / teacher123');
      
      console.log('\n📚 Sample Data Loaded:');
      console.log('   • 3 Users (1 Principal, 2 Teachers)');
      console.log('   • 3 Classes (10A, 10B, 11A)');
      console.log('   • 7 Subjects (Math, Physics, etc.)');
      console.log('   • 16 Students across all classes');
      console.log('   • 5 Schedule entries');
      
      console.log('\n✅ Server ready to accept connections!');
      console.log('=================================================\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 ${signal} received. Starting graceful shutdown...`);
  
  // Close server
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
    // Close Socket.IO
    io.close(() => {
      console.log('✅ Socket.IO server closed');
    });
    
    // Close database connections if any
    // await closeDatabaseConnections();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };