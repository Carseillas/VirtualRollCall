// backend/models/Class.js - Class Data Model

/**
 * Class Model Schema
 * 
 * Represents a class/section in the school with its students and metadata
 * Manages student enrollment, capacity, and class information
 */

class Class {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name; // Class name (e.g., "10A", "11B")
    this.grade = data.grade; // Grade level (1-12)
    this.section = data.section || 'A'; // Section identifier
    this.classTeacher = data.classTeacher || null; // Teacher ID responsible for class
    this.academicYear = data.academicYear || this.getCurrentAcademicYear();
    this.maxStudents = data.maxStudents || 35; // Maximum capacity
    this.students = data.students || []; // Array of student objects
    this.subjects = data.subjects || []; // Array of subject IDs taught to this class
    this.room = data.room || null; // Classroom number/name
    this.schedule = data.schedule || {}; // Weekly schedule
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Additional metadata
    this.metadata = data.metadata || {
      totalBoys: 0,
      totalGirls: 0,
      averageAge: 0,
      startDate: null,
      endDate: null
    };
  }

  /**
   * Get current academic year
   */
  getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Academic year starts in September (month 9)
    if (month >= 9) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  /**
   * Validate class data
   */
  validate() {
    const errors = [];

    // Required fields validation
    if (!this.name || typeof this.name !== 'string' || this.name.trim().length === 0) {
      errors.push('Class name is required');
    }

    if (!this.grade || !Number.isInteger(this.grade) || this.grade < 1 || this.grade > 12) {
      errors.push('Grade must be between 1 and 12');
    }

    if (this.section && (typeof this.section !== 'string' || this.section.length > 5)) {
      errors.push('Section must be a string with maximum 5 characters');
    }

    if (this.maxStudents && (!Number.isInteger(this.maxStudents) || this.maxStudents < 1 || this.maxStudents > 100)) {
      errors.push('Maximum students must be between 1 and 100');
    }

    // Validate students array
    if (!Array.isArray(this.students)) {
      errors.push('Students must be an array');
    }

    // Check if current enrollment exceeds capacity
    if (this.students.length > this.maxStudents) {
      errors.push(`Current enrollment (${this.students.length}) exceeds maximum capacity (${this.maxStudents})`);
    }

    // Validate classTeacher if provided
    if (this.classTeacher !== null && !Number.isInteger(this.classTeacher)) {
      errors.push('Class teacher must be a valid teacher ID');
    }

    // Validate academic year format
    if (this.academicYear && !this.isValidAcademicYear(this.academicYear)) {
      errors.push('Academic year must be in format YYYY-YYYY (e.g., 2024-2025)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if academic year format is valid
   */
  isValidAcademicYear(year) {
    const regex = /^\d{4}-\d{4}$/;
    if (!regex.test(year)) return false;
    
    const [startYear, endYear] = year.split('-').map(Number);
    return endYear === startYear + 1;
  }

  /**
   * Get active students
   */
  getActiveStudents() {
    return this.students.filter(student => student.isActive !== false);
  }

  /**
   * Get inactive students
   */
  getInactiveStudents() {
    return this.students.filter(student => student.isActive === false);
  }

  /**
   * Get student count
   */
  getStudentCount() {
    return this.getActiveStudents().length;
  }

  /**
   * Get available seats
   */
  getAvailableSeats() {
    return this.maxStudents - this.getStudentCount();
  }

  /**
   * Check if class is full
   */
  isFull() {
    return this.getStudentCount() >= this.maxStudents;
  }

  /**
   * Get capacity utilization percentage
   */
  getCapacityUtilization() {
    const count = this.getStudentCount();
    return this.maxStudents > 0 ? Math.round((count / this.maxStudents) * 100) : 0;
  }

  /**
   * Add student to class
   */
  addStudent(studentData) {
    // Check capacity
    if (this.isFull()) {
      throw new Error('Class has reached maximum capacity');
    }

    // Check for duplicate student ID
    const existingStudent = this.students.find(s => 
      s.studentId === studentData.studentId && s.isActive !== false
    );

    if (existingStudent) {
      throw new Error('Student with this ID already exists in the class');
    }

    // Create student object
    const student = {
      id: this.generateStudentId(),
      name: studentData.name,
      studentId: studentData.studentId,
      email: studentData.email || null,
      phone: studentData.phone || null,
      dateOfBirth: studentData.dateOfBirth || null,
      gender: studentData.gender || null,
      parentContact: studentData.parentContact || null,
      parentEmail: studentData.parentEmail || null,
      address: studentData.address || null,
      isActive: true,
      enrolledDate: new Date().toISOString(),
      metadata: studentData.metadata || {}
    };

    this.students.push(student);
    this.updatedAt = new Date().toISOString();
    
    return student;
  }

  /**
   * Remove student from class (soft delete)
   */
  removeStudent(studentId) {
    const studentIndex = this.students.findIndex(s => s.id === studentId);
    
    if (studentIndex === -1) {
      throw new Error('Student not found in class');
    }

    this.students[studentIndex].isActive = false;
    this.students[studentIndex].removedDate = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    
    return this.students[studentIndex];
  }

  /**
   * Permanently remove student from class
   */
  permanentlyRemoveStudent(studentId) {
    const initialLength = this.students.length;
    this.students = this.students.filter(s => s.id !== studentId);
    
    if (this.students.length === initialLength) {
      throw new Error('Student not found in class');
    }

    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Restore removed student
   */
  restoreStudent(studentId) {
    const student = this.students.find(s => s.id === studentId);
    
    if (!student) {
      throw new Error('Student not found in class');
    }

    if (student.isActive) {
      throw new Error('Student is already active');
    }

    // Check capacity before restoring
    if (this.isFull()) {
      throw new Error('Class has reached maximum capacity');
    }

    student.isActive = true;
    delete student.removedDate;
    this.updatedAt = new Date().toISOString();
    
    return student;
  }

  /**
   * Find student by ID
   */
  findStudent(studentId) {
    return this.students.find(s => s.id === studentId);
  }

  /**
   * Find student by student ID (enrollment ID)
   */
  findStudentByStudentId(studentId) {
    return this.students.find(s => s.studentId === studentId && s.isActive !== false);
  }

  /**
   * Update student information
   */
  updateStudent(studentId, updateData) {
    const student = this.findStudent(studentId);
    
    if (!student) {
      throw new Error('Student not found in class');
    }

    // Update allowed fields
    const allowedFields = ['name', 'email', 'phone', 'dateOfBirth', 'gender', 
                          'parentContact', 'parentEmail', 'address', 'metadata'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        student[field] = updateData[field];
      }
    });

    student.updatedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    
    return student;
  }

  /**
   * Search students by name or student ID
   */
  searchStudents(query) {
    const searchTerm = query.toLowerCase();
    return this.getActiveStudents().filter(student => 
      student.name.toLowerCase().includes(searchTerm) ||
      student.studentId.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get students by gender
   */
  getStudentsByGender(gender) {
    return this.getActiveStudents().filter(student => 
      student.gender === gender
    );
  }

  /**
   * Calculate class statistics
   */
  getStatistics() {
    const activeStudents = this.getActiveStudents();
    const boys = activeStudents.filter(s => s.gender === 'male').length;
    const girls = activeStudents.filter(s => s.gender === 'female').length;
    
    return {
      totalStudents: activeStudents.length,
      totalBoys: boys,
      totalGirls: girls,
      inactiveStudents: this.getInactiveStudents().length,
      maxCapacity: this.maxStudents,
      availableSeats: this.getAvailableSeats(),
      capacityUtilization: this.getCapacityUtilization(),
      isFull: this.isFull(),
      genderRatio: activeStudents.length > 0 
        ? {
            boys: Math.round((boys / activeStudents.length) * 100),
            girls: Math.round((girls / activeStudents.length) * 100)
          }
        : { boys: 0, girls: 0 }
    };
  }

  /**
   * Assign class teacher
   */
  assignClassTeacher(teacherId) {
    if (!Number.isInteger(teacherId)) {
      throw new Error('Teacher ID must be a valid integer');
    }

    this.classTeacher = teacherId;
    this.updatedAt = new Date().toISOString();
    
    return this;
  }

  /**
   * Remove class teacher
   */
  removeClassTeacher() {
    this.classTeacher = null;
    this.updatedAt = new Date().toISOString();
    
    return this;
  }

  /**
   * Add subject to class
   */
  addSubject(subjectId) {
    if (!Number.isInteger(subjectId)) {
      throw new Error('Subject ID must be a valid integer');
    }

    if (!this.subjects.includes(subjectId)) {
      this.subjects.push(subjectId);
      this.updatedAt = new Date().toISOString();
    }
    
    return this;
  }

  /**
   * Remove subject from class
   */
  removeSubject(subjectId) {
    const initialLength = this.subjects.length;
    this.subjects = this.subjects.filter(id => id !== subjectId);
    
    if (this.subjects.length < initialLength) {
      this.updatedAt = new Date().toISOString();
    }
    
    return this;
  }

  /**
   * Archive class
   */
  archive() {
    this.isActive = false;
    this.archivedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    
    return this;
  }

  /**
   * Restore archived class
   */
  restore() {
    this.isActive = true;
    delete this.archivedAt;
    this.updatedAt = new Date().toISOString();
    
    return this;
  }

  /**
   * Generate unique student ID
   */
  generateStudentId() {
    const maxId = this.students.reduce((max, student) => 
      Math.max(max, student.id || 0), 0
    );
    return maxId + 1;
  }

  /**
   * Convert to plain object (for JSON response)
   */
  toJSON() {
    const stats = this.getStatistics();
    
    return {
      id: this.id,
      name: this.name,
      grade: this.grade,
      section: this.section,
      fullName: `${this.name} - Grade ${this.grade}`,
      classTeacher: this.classTeacher,
      academicYear: this.academicYear,
      maxStudents: this.maxStudents,
      room: this.room,
      subjects: this.subjects,
      students: this.students,
      statistics: stats,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to summary object (without student details)
   */
  toSummaryJSON() {
    const stats = this.getStatistics();
    
    return {
      id: this.id,
      name: this.name,
      grade: this.grade,
      section: this.section,
      fullName: `${this.name} - Grade ${this.grade}`,
      classTeacher: this.classTeacher,
      academicYear: this.academicYear,
      maxStudents: this.maxStudents,
      studentCount: stats.totalStudents,
      availableSeats: stats.availableSeats,
      capacityUtilization: stats.capacityUtilization,
      room: this.room,
      isActive: this.isActive
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row) {
    return new Class({
      id: row.id,
      name: row.name,
      grade: row.grade,
      section: row.section,
      classTeacher: row.class_teacher || row.classTeacher,
      academicYear: row.academic_year || row.academicYear,
      maxStudents: row.max_students || row.maxStudents || 35,
      students: typeof row.students === 'string' 
        ? JSON.parse(row.students) 
        : row.students || [],
      subjects: typeof row.subjects === 'string' 
        ? JSON.parse(row.subjects) 
        : row.subjects || [],
      room: row.room,
      schedule: typeof row.schedule === 'string' 
        ? JSON.parse(row.schedule) 
        : row.schedule || {},
      isActive: row.is_active !== undefined ? row.is_active : row.isActive !== undefined ? row.isActive : true,
      metadata: typeof row.metadata === 'string' 
        ? JSON.parse(row.metadata) 
        : row.metadata || {},
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
      name: this.name,
      grade: this.grade,
      section: this.section,
      class_teacher: this.classTeacher,
      academic_year: this.academicYear,
      max_students: this.maxStudents,
      students: JSON.stringify(this.students),
      subjects: JSON.stringify(this.subjects),
      room: this.room,
      schedule: JSON.stringify(this.schedule),
      is_active: this.isActive,
      metadata: JSON.stringify(this.metadata),
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Clone this class (without students)
   */
  clone() {
    return new Class({
      name: this.name,
      grade: this.grade,
      section: this.section,
      classTeacher: this.classTeacher,
      academicYear: this.academicYear,
      maxStudents: this.maxStudents,
      subjects: [...this.subjects],
      room: this.room
    });
  }

  /**
   * Merge with updated data
   */
  merge(updateData) {
    const allowedFields = ['name', 'grade', 'section', 'classTeacher', 
                          'maxStudents', 'room', 'subjects', 'schedule'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        this[field] = updateData[field];
      }
    });

    this.updatedAt = new Date().toISOString();
    return this;
  }
}

/**
 * Static factory methods
 */

/**
 * Create a new class
 */
Class.create = function(data) {
  const classObj = new Class(data);
  const validation = classObj.validate();
  
  if (!validation.isValid) {
    throw new Error('Invalid class data: ' + validation.errors.join(', '));
  }
  
  return classObj;
};

/**
 * Create multiple classes
 */
Class.createBatch = function(dataArray) {
  return dataArray.map(data => Class.create(data));
};

/**
 * Get database schema for migration
 */
Class.getSchema = function() {
  return {
    tableName: 'classes',
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'VARCHAR(50) NOT NULL',
      grade: 'INTEGER NOT NULL',
      section: 'VARCHAR(5) DEFAULT "A"',
      class_teacher: 'INTEGER',
      academic_year: 'VARCHAR(10) NOT NULL',
      max_students: 'INTEGER DEFAULT 35',
      students: 'TEXT NOT NULL', // JSON array
      subjects: 'TEXT', // JSON array
      room: 'VARCHAR(50)',
      schedule: 'TEXT', // JSON object
      is_active: 'BOOLEAN DEFAULT 1',
      metadata: 'TEXT', // JSON object
      created_at: 'DATETIME NOT NULL',
      updated_at: 'DATETIME NOT NULL',
      archived_at: 'DATETIME'
    },
    indexes: [
      'CREATE INDEX idx_classes_grade ON classes(grade)',
      'CREATE INDEX idx_classes_teacher ON classes(class_teacher)',
      'CREATE INDEX idx_classes_active ON classes(is_active)',
      'CREATE INDEX idx_classes_year ON classes(academic_year)',
      'CREATE UNIQUE INDEX idx_classes_unique ON classes(name, grade, academic_year, is_active)'
    ],
    foreignKeys: [
      'FOREIGN KEY (class_teacher) REFERENCES users(id)'
    ]
  };
};

/**
 * Get validation rules
 */
Class.getValidationRules = function() {
  return {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 50
    },
    grade: {
      type: 'integer',
      required: true,
      min: 1,
      max: 12
    },
    section: {
      type: 'string',
      required: false,
      maxLength: 5
    },
    maxStudents: {
      type: 'integer',
      required: false,
      default: 35,
      min: 1,
      max: 100
    }
  };
};

// Export the model
module.exports = Class;