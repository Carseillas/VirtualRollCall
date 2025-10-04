// backend/models/Attendance.js - Attendance Data Model

/**
 * Attendance Model Schema
 * 
 * Represents a single attendance record for a class session
 * Tracks which students were present/absent for a specific class, subject, and date
 */

class Attendance {
  constructor(data) {
    this.id = data.id || null;
    this.teacherId = data.teacherId; // ID of teacher who submitted attendance
    this.classId = data.classId; // ID of the class
    this.subjectId = data.subjectId; // ID of the subject being taught
    this.date = data.date; // Date in YYYY-MM-DD format
    this.absentStudents = data.absentStudents || []; // Array of student IDs who were absent
    this.presentStudents = data.presentStudents || []; // Array of student IDs who were present
    this.totalStudents = data.totalStudents || 0; // Total number of students in class
    this.notes = data.notes || ''; // Optional notes/remarks
    this.submittedAt = data.submittedAt || new Date().toISOString(); // Timestamp when submitted
    this.submittedBy = data.submittedBy || data.teacherId; // User ID who submitted
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Additional metadata
    this.isLateSubmission = data.isLateSubmission || false; // Was this submitted after deadline?
    this.editHistory = data.editHistory || []; // Array of edit records
    this.status = data.status || 'active'; // active, archived, deleted
  }

  /**
   * Validate attendance data
   */
  validate() {
    const errors = [];

    // Required fields validation
    if (!this.teacherId || !Number.isInteger(this.teacherId)) {
      errors.push('Valid teacher ID is required');
    }

    if (!this.classId || !Number.isInteger(this.classId)) {
      errors.push('Valid class ID is required');
    }

    if (!this.subjectId || !Number.isInteger(this.subjectId)) {
      errors.push('Valid subject ID is required');
    }

    if (!this.date || !this.isValidDate(this.date)) {
      errors.push('Valid date is required (YYYY-MM-DD format)');
    }

    // Validate date is not in the future
    if (this.date && new Date(this.date) > new Date()) {
      errors.push('Date cannot be in the future');
    }

    // Array validation
    if (!Array.isArray(this.absentStudents)) {
      errors.push('Absent students must be an array');
    }

    if (!Array.isArray(this.presentStudents)) {
      errors.push('Present students must be an array');
    }

    // Check for duplicate student IDs
    const duplicates = this.absentStudents.filter(id => 
      this.presentStudents.includes(id)
    );

    if (duplicates.length > 0) {
      errors.push('Students cannot be both present and absent');
    }

    // Notes length validation
    if (this.notes && this.notes.length > 1000) {
      errors.push('Notes must be less than 1000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if date is in valid format (YYYY-MM-DD)
   */
  isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Calculate attendance statistics
   */
  calculateStatistics() {
    const presentCount = this.presentStudents.length;
    const absentCount = this.absentStudents.length;
    const total = this.totalStudents || (presentCount + absentCount);
    
    return {
      totalStudents: total,
      presentCount,
      absentCount,
      presentPercentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
      absentPercentage: total > 0 ? Math.round((absentCount / total) * 100) : 0,
      attendanceRate: total > 0 ? Math.round((presentCount / total) * 100) : 0
    };
  }

  /**
   * Mark student as absent
   */
  markAbsent(studentId) {
    const id = parseInt(studentId);
    
    // Remove from present if exists
    this.presentStudents = this.presentStudents.filter(sid => sid !== id);
    
    // Add to absent if not already there
    if (!this.absentStudents.includes(id)) {
      this.absentStudents.push(id);
    }
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Mark student as present
   */
  markPresent(studentId) {
    const id = parseInt(studentId);
    
    // Remove from absent if exists
    this.absentStudents = this.absentStudents.filter(sid => sid !== id);
    
    // Add to present if not already there
    if (!this.presentStudents.includes(id)) {
      this.presentStudents.push(id);
    }
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Check if a student is absent
   */
  isStudentAbsent(studentId) {
    return this.absentStudents.includes(parseInt(studentId));
  }

  /**
   * Check if a student is present
   */
  isStudentPresent(studentId) {
    return this.presentStudents.includes(parseInt(studentId));
  }

  /**
   * Add note or update existing note
   */
  addNote(note, userId) {
    this.notes = note.trim();
    this.updatedAt = new Date().toISOString();
    
    // Add to edit history
    this.editHistory.push({
      action: 'note_updated',
      userId,
      timestamp: new Date().toISOString(),
      previousNote: this.notes
    });
    
    return this;
  }

  /**
   * Record an edit in history
   */
  recordEdit(userId, changes) {
    this.editHistory.push({
      userId,
      timestamp: new Date().toISOString(),
      changes
    });
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Check if submission was late (after a specific time)
   */
  checkLateSubmission(deadlineTime = '10:00') {
    const submissionTime = new Date(this.submittedAt).toTimeString().slice(0, 5);
    this.isLateSubmission = submissionTime > deadlineTime;
    return this.isLateSubmission;
  }

  /**
   * Archive this attendance record
   */
  archive() {
    this.status = 'archived';
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Restore archived attendance record
   */
  restore() {
    this.status = 'active';
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Soft delete attendance record
   */
  softDelete(userId) {
    this.status = 'deleted';
    this.deletedAt = new Date().toISOString();
    this.deletedBy = userId;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Convert to plain object (for JSON response)
   */
  toJSON() {
    const stats = this.calculateStatistics();
    
    return {
      id: this.id,
      teacherId: this.teacherId,
      classId: this.classId,
      subjectId: this.subjectId,
      date: this.date,
      absentStudents: this.absentStudents,
      presentStudents: this.presentStudents,
      totalStudents: this.totalStudents,
      statistics: stats,
      notes: this.notes,
      submittedAt: this.submittedAt,
      submittedBy: this.submittedBy,
      isLateSubmission: this.isLateSubmission,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      editCount: this.editHistory.length
    };
  }

  /**
   * Convert to detailed object (includes edit history)
   */
  toDetailedJSON() {
    return {
      ...this.toJSON(),
      editHistory: this.editHistory,
      metadata: {
        hasNotes: !!this.notes,
        wasEdited: this.editHistory.length > 0,
        lastEditedAt: this.editHistory.length > 0 
          ? this.editHistory[this.editHistory.length - 1].timestamp 
          : null
      }
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row) {
    return new Attendance({
      id: row.id,
      teacherId: row.teacher_id || row.teacherId,
      classId: row.class_id || row.classId,
      subjectId: row.subject_id || row.subjectId,
      date: row.date,
      absentStudents: typeof row.absent_students === 'string' 
        ? JSON.parse(row.absent_students) 
        : row.absentStudents || [],
      presentStudents: typeof row.present_students === 'string' 
        ? JSON.parse(row.present_students) 
        : row.presentStudents || [],
      totalStudents: row.total_students || row.totalStudents || 0,
      notes: row.notes || '',
      submittedAt: row.submitted_at || row.submittedAt,
      submittedBy: row.submitted_by || row.submittedBy,
      isLateSubmission: row.is_late_submission || row.isLateSubmission || false,
      editHistory: typeof row.edit_history === 'string' 
        ? JSON.parse(row.edit_history) 
        : row.editHistory || [],
      status: row.status || 'active',
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    });
  }

  /**
   * Convert to database format
   */
  toDatabaseFormat() {
    return {
      id: this.id,
      teacher_id: this.teacherId,
      class_id: this.classId,
      subject_id: this.subjectId,
      date: this.date,
      absent_students: JSON.stringify(this.absentStudents),
      present_students: JSON.stringify(this.presentStudents),
      total_students: this.totalStudents,
      notes: this.notes,
      submitted_at: this.submittedAt,
      submitted_by: this.submittedBy,
      is_late_submission: this.isLateSubmission,
      edit_history: JSON.stringify(this.editHistory),
      status: this.status,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Compare with another attendance record
   */
  equals(otherAttendance) {
    if (!(otherAttendance instanceof Attendance)) return false;
    
    return (
      this.classId === otherAttendance.classId &&
      this.subjectId === otherAttendance.subjectId &&
      this.date === otherAttendance.date
    );
  }

  /**
   * Clone this attendance record
   */
  clone() {
    return new Attendance({
      ...this.toJSON(),
      id: null, // New record shouldn't have ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Merge with updated data
   */
  merge(updateData) {
    const changes = {};
    
    if (updateData.absentStudents !== undefined) {
      changes.absentStudents = {
        old: [...this.absentStudents],
        new: updateData.absentStudents
      };
      this.absentStudents = updateData.absentStudents;
    }
    
    if (updateData.presentStudents !== undefined) {
      changes.presentStudents = {
        old: [...this.presentStudents],
        new: updateData.presentStudents
      };
      this.presentStudents = updateData.presentStudents;
    }
    
    if (updateData.notes !== undefined) {
      changes.notes = {
        old: this.notes,
        new: updateData.notes
      };
      this.notes = updateData.notes;
    }
    
    if (updateData.totalStudents !== undefined) {
      this.totalStudents = updateData.totalStudents;
    }
    
    this.updatedAt = new Date().toISOString();
    
    // Record changes in edit history
    if (Object.keys(changes).length > 0) {
      this.editHistory.push({
        userId: updateData.updatedBy || this.submittedBy,
        timestamp: new Date().toISOString(),
        changes
      });
    }
    
    return this;
  }
}

/**
 * Static factory methods
 */

/**
 * Create a new attendance record
 */
Attendance.create = function(data) {
  const attendance = new Attendance(data);
  const validation = attendance.validate();
  
  if (!validation.isValid) {
    throw new Error('Invalid attendance data: ' + validation.errors.join(', '));
  }
  
  return attendance;
};

/**
 * Create multiple attendance records
 */
Attendance.createBatch = function(dataArray) {
  return dataArray.map(data => Attendance.create(data));
};

/**
 * Get database schema for migration
 */
Attendance.getSchema = function() {
  return {
    tableName: 'attendance',
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      teacher_id: 'INTEGER NOT NULL',
      class_id: 'INTEGER NOT NULL',
      subject_id: 'INTEGER NOT NULL',
      date: 'DATE NOT NULL',
      absent_students: 'TEXT NOT NULL', // JSON array
      present_students: 'TEXT NOT NULL', // JSON array
      total_students: 'INTEGER NOT NULL DEFAULT 0',
      notes: 'TEXT',
      submitted_at: 'DATETIME NOT NULL',
      submitted_by: 'INTEGER NOT NULL',
      is_late_submission: 'BOOLEAN DEFAULT 0',
      edit_history: 'TEXT', // JSON array
      status: 'VARCHAR(20) DEFAULT "active"',
      created_at: 'DATETIME NOT NULL',
      updated_at: 'DATETIME NOT NULL',
      deleted_at: 'DATETIME',
      deleted_by: 'INTEGER'
    },
    indexes: [
      'CREATE INDEX idx_attendance_class ON attendance(class_id)',
      'CREATE INDEX idx_attendance_subject ON attendance(subject_id)',
      'CREATE INDEX idx_attendance_date ON attendance(date)',
      'CREATE INDEX idx_attendance_teacher ON attendance(teacher_id)',
      'CREATE INDEX idx_attendance_status ON attendance(status)',
      'CREATE UNIQUE INDEX idx_attendance_unique ON attendance(class_id, subject_id, date, status)'
    ],
    foreignKeys: [
      'FOREIGN KEY (teacher_id) REFERENCES users(id)',
      'FOREIGN KEY (class_id) REFERENCES classes(id)',
      'FOREIGN KEY (subject_id) REFERENCES subjects(id)'
    ]
  };
};

/**
 * Get validation rules
 */
Attendance.getValidationRules = function() {
  return {
    teacherId: {
      type: 'integer',
      required: true,
      min: 1
    },
    classId: {
      type: 'integer',
      required: true,
      min: 1
    },
    subjectId: {
      type: 'integer',
      required: true,
      min: 1
    },
    date: {
      type: 'date',
      required: true,
      format: 'YYYY-MM-DD',
      maxDate: 'today'
    },
    absentStudents: {
      type: 'array',
      required: false,
      default: [],
      itemType: 'integer'
    },
    presentStudents: {
      type: 'array',
      required: false,
      default: [],
      itemType: 'integer'
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 1000
    }
  };
};

// Export the model
module.exports = Attendance;