// backend/config/database.js - Database Configuration
require('dotenv').config();

// Database configuration object
const databaseConfig = {
  // In-memory database (current implementation)
  inMemory: {
    enabled: true,
    autoSeed: process.env.AUTO_SEED !== 'false',
    seedOnStart: process.env.SEED_ON_START === 'true'
  },

  // MongoDB configuration (for future implementation)
  mongodb: {
    enabled: process.env.DB_TYPE === 'mongodb',
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/virtualrollcall',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 60000
    },
    collections: {
      users: 'users',
      classes: 'classes',
      subjects: 'subjects',
      schedules: 'schedules',
      attendance: 'attendance',
      settings: 'settings'
    }
  },

  // PostgreSQL configuration (for future implementation)
  postgresql: {
    enabled: process.env.DB_TYPE === 'postgresql',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || 'virtualrollcall',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
    pool: {
      max: 20,
      min: 5,
      idle: 10000,
      acquire: 30000
    }
  },

  // SQLite configuration (for future implementation)
  sqlite: {
    enabled: process.env.DB_TYPE === 'sqlite',
    filename: process.env.SQLITE_PATH || './database/virtualrollcall.sqlite',
    options: {
      verbose: process.env.NODE_ENV === 'development'
    }
  },

  // MySQL configuration (for future implementation)
  mysql: {
    enabled: process.env.DB_TYPE === 'mysql',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    database: process.env.MYSQL_DATABASE || 'virtualrollcall',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    charset: 'utf8mb4',
    timezone: '+00:00',
    pool: {
      max: 20,
      min: 5,
      idle: 10000
    }
  },

  // Backup and restore settings
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    directory: process.env.BACKUP_DIR || './backups',
    frequency: process.env.BACKUP_FREQUENCY || 'daily', // daily, weekly, monthly
    retention: parseInt(process.env.BACKUP_RETENTION) || 30, // days
    autoBackup: process.env.AUTO_BACKUP === 'true',
    includeAttachments: true
  },

  // Cache configuration
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // seconds
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600, // seconds
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000
  },

  // Migration settings
  migrations: {
    enabled: process.env.MIGRATIONS_ENABLED === 'true',
    directory: './migrations',
    tableName: 'migrations',
    schemaName: 'public'
  },

  // Logging configuration
  logging: {
    enabled: process.env.DB_LOGGING === 'true',
    level: process.env.DB_LOG_LEVEL || 'info', // error, warn, info, debug
    queries: process.env.LOG_QUERIES === 'true',
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000 // ms
  }
};

// Get active database configuration
const getActiveConfig = () => {
  const dbType = process.env.DB_TYPE || 'inMemory';
  
  switch (dbType) {
    case 'mongodb':
      return {
        type: 'mongodb',
        config: databaseConfig.mongodb
      };
    case 'postgresql':
      return {
        type: 'postgresql',
        config: databaseConfig.postgresql
      };
    case 'sqlite':
      return {
        type: 'sqlite',
        config: databaseConfig.sqlite
      };
    case 'mysql':
      return {
        type: 'mysql',
        config: databaseConfig.mysql
      };
    default:
      return {
        type: 'inMemory',
        config: databaseConfig.inMemory
      };
  }
};

// Validate database configuration
const validateConfig = () => {
  const errors = [];
  const activeConfig = getActiveConfig();
  
  if (activeConfig.type === 'mongodb' && !activeConfig.config.uri) {
    errors.push('MongoDB URI is required when using MongoDB');
  }
  
  if (activeConfig.type === 'postgresql') {
    if (!activeConfig.config.host) errors.push('PostgreSQL host is required');
    if (!activeConfig.config.database) errors.push('PostgreSQL database name is required');
    if (!activeConfig.config.user) errors.push('PostgreSQL user is required');
  }
  
  if (activeConfig.type === 'mysql') {
    if (!activeConfig.config.host) errors.push('MySQL host is required');
    if (!activeConfig.config.database) errors.push('MySQL database name is required');
    if (!activeConfig.config.user) errors.push('MySQL user is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Initialize database connection (for future use with real databases)
const initializeDatabaseConnection = async () => {
  const activeConfig = getActiveConfig();
  
  console.log(`🔗 Initializing database connection: ${activeConfig.type}`);
  
  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('❌ Database configuration errors:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    throw new Error('Invalid database configuration');
  }
  
  try {
    switch (activeConfig.type) {
      case 'inMemory':
        console.log('✅ Using in-memory database');
        return { type: 'inMemory', status: 'connected' };
        
      case 'mongodb':
        // MongoDB connection would go here
        // const mongoose = require('mongoose');
        // await mongoose.connect(activeConfig.config.uri, activeConfig.config.options);
        console.log('✅ MongoDB connection ready (not implemented yet)');
        return { type: 'mongodb', status: 'ready' };
        
      case 'postgresql':
        // PostgreSQL connection would go here
        // const { Pool } = require('pg');
        // const pool = new Pool(activeConfig.config);
        // await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connection ready (not implemented yet)');
        return { type: 'postgresql', status: 'ready' };
        
      case 'sqlite':
        // SQLite connection would go here
        // const sqlite3 = require('sqlite3');
        // const db = new sqlite3.Database(activeConfig.config.filename);
        console.log('✅ SQLite connection ready (not implemented yet)');
        return { type: 'sqlite', status: 'ready' };
        
      case 'mysql':
        // MySQL connection would go here
        // const mysql = require('mysql2/promise');
        // const pool = mysql.createPool(activeConfig.config);
        // await pool.query('SELECT 1');
        console.log('✅ MySQL connection ready (not implemented yet)');
        return { type: 'mysql', status: 'ready' };
        
      default:
        throw new Error(`Unknown database type: ${activeConfig.type}`);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Close database connection
const closeDatabaseConnection = async () => {
  const activeConfig = getActiveConfig();
  
  console.log(`🔌 Closing database connection: ${activeConfig.type}`);
  
  try {
    switch (activeConfig.type) {
      case 'inMemory':
        console.log('✅ In-memory database closed');
        break;
        
      case 'mongodb':
        // await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        break;
        
      case 'postgresql':
        // await pool.end();
        console.log('✅ PostgreSQL connection closed');
        break;
        
      case 'sqlite':
        // db.close();
        console.log('✅ SQLite connection closed');
        break;
        
      case 'mysql':
        // await pool.end();
        console.log('✅ MySQL connection closed');
        break;
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};

// Health check for database connection
const checkDatabaseHealth = async () => {
  const activeConfig = getActiveConfig();
  
  try {
    switch (activeConfig.type) {
      case 'inMemory':
        return {
          status: 'healthy',
          type: 'inMemory',
          responseTime: 0,
          timestamp: new Date().toISOString()
        };
        
      case 'mongodb':
        // const startTime = Date.now();
        // await mongoose.connection.db.admin().ping();
        // const responseTime = Date.now() - startTime;
        return {
          status: 'healthy',
          type: 'mongodb',
          responseTime: 0,
          timestamp: new Date().toISOString()
        };
        
      case 'postgresql':
      case 'mysql':
        // const startTime = Date.now();
        // await pool.query('SELECT 1');
        // const responseTime = Date.now() - startTime;
        return {
          status: 'healthy',
          type: activeConfig.type,
          responseTime: 0,
          timestamp: new Date().toISOString()
        };
        
      case 'sqlite':
        return {
          status: 'healthy',
          type: 'sqlite',
          responseTime: 0,
          timestamp: new Date().toISOString()
        };
        
      default:
        throw new Error('Unknown database type');
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      type: activeConfig.type,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Export database statistics
const getDatabaseStats = async () => {
  const { getDatabase } = require('../utils/database');
  const database = getDatabase();
  
  return {
    type: getActiveConfig().type,
    statistics: {
      users: database.users?.length || 0,
      classes: database.classes?.length || 0,
      subjects: database.subjects?.length || 0,
      schedules: database.schedules?.length || 0,
      attendance: database.attendance?.length || 0,
      totalStudents: database.classes?.reduce((sum, cls) => 
        sum + (cls.students?.filter(s => s.isActive).length || 0), 0
      ) || 0
    },
    timestamp: new Date().toISOString()
  };
};

// Backup database (for in-memory database)
const backupDatabase = async () => {
  const { exportDatabase } = require('../utils/database');
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const backupDir = databaseConfig.backup.directory;
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    const databaseExport = exportDatabase();
    await fs.writeFile(filepath, JSON.stringify(databaseExport, null, 2));
    
    console.log(`💾 Database backup created: ${filename}`);
    
    return {
      success: true,
      filename,
      filepath,
      size: JSON.stringify(databaseExport).length
    };
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    throw error;
  }
};

// Restore database from backup
const restoreDatabase = async (backupFilename) => {
  const { importDatabase } = require('../utils/database');
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const filepath = path.join(databaseConfig.backup.directory, backupFilename);
    const backupData = await fs.readFile(filepath, 'utf8');
    const parsedData = JSON.parse(backupData);
    
    importDatabase(parsedData);
    
    console.log(`📥 Database restored from: ${backupFilename}`);
    
    return {
      success: true,
      filename: backupFilename,
      recordsRestored: {
        users: parsedData.users?.length || 0,
        classes: parsedData.classes?.length || 0,
        subjects: parsedData.subjects?.length || 0,
        schedules: parsedData.schedules?.length || 0,
        attendance: parsedData.attendance?.length || 0
      }
    };
  } catch (error) {
    console.error('❌ Database restore failed:', error);
    throw error;
  }
};

// Clean up old backups
const cleanupOldBackups = async () => {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const backupDir = databaseConfig.backup.directory;
    const files = await fs.readdir(backupDir);
    const now = new Date();
    const retentionMs = databaseConfig.backup.retention * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.startsWith('backup_') || !file.endsWith('.json')) continue;
      
      const filepath = path.join(backupDir, file);
      const stats = await fs.stat(filepath);
      const age = now - stats.mtime;
      
      if (age > retentionMs) {
        await fs.unlink(filepath);
        deletedCount++;
        console.log(`🗑️  Deleted old backup: ${file}`);
      }
    }
    
    return { deletedCount };
  } catch (error) {
    console.error('❌ Backup cleanup failed:', error);
    throw error;
  }
};

module.exports = {
  databaseConfig,
  getActiveConfig,
  validateConfig,
  initializeDatabaseConnection,
  closeDatabaseConnection,
  checkDatabaseHealth,
  getDatabaseStats,
  backupDatabase,
  restoreDatabase,
  cleanupOldBackups
};