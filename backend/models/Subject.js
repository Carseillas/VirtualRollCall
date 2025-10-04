// backend/models/Subject.js - Subject Data Model

/**
 * Subject Model Schema
 * 
 * Represents an academic subject/course in the school curriculum
 * Manages subject information, teachers, and curriculum details
 */

class Subject {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name; // Subject name (e.g., "Mathematics", "Physics")
    this.code = data.code; // Subject code (e.g., "MATH", "PHYS")
    this.description = data.description || ''; // Detailed description
    this.department = data.department || null; // Department (Science, Arts, etc.)
    this.credits = data.credits || 1; // Credit hours
    this.type = data.type || 'core'; // core, elective, mandatory, optional
    this.level = data.level || null; // beginner, intermediate, advanced
    this.prerequisites = data.prerequisites || []; // Array of prerequisite subject IDs
    this.teachers = data.teachers || []; // Array of teacher IDs who teach this subject
    this.gradeRange = data.gradeRange || { min: 1, max: 12 }; // Applicable grade range
    this.syllabus = data.syllabus || null; // Syllabus file URL or content
    this.resources = data.resources || []; // Array of resource links/materials
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isPractical = data.isPractical || false; // Has practical/lab component
    this.practicalHours = data.practicalHours || 0; // Weekly practical hours
    this.theoryHours = data.theoryHours || 0; // Weekly theory hours
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Additional metadata
    this.metadata = data.metadata || {
      color: null, // Color code for UI representation
      icon: null, // Icon identifier
      sortOrder: 0, // Display order
      examType: 'written', // written, practical, both
      passingMarks: 40, // Minimum passing percentage
      maxMarks: 100 // Maximum marks
    };
  }

  /**
   * Validate subject data
   */
  validate() {
    const errors = [];

    // Required fields validation
    if (!this.name || typeof this.name !== 'string' || this.name.trim().length < 2) {
      errors.push('Subject name is required and must be at least 2 characters');
    }

    if (this.name && this.name.length > 100) {
      errors.push('Subject name must be less than 100 characters');
    }

    if (!this.code || typeof this.code !== 'string' || this.code.trim().length < 2) {
      errors.push('Subject code is required and must be at least 2 characters');
    }

    if (this.code && this.code.length > 10) {
      errors.push('Subject code must be less than 10 characters');
    }

    // Code format validation (uppercase letters and numbers only)
    if (this.code && !/^[A-Z0-9]+$/.test(this.code)) {
      errors.push('Subject code must contain only uppercase letters and numbers');
    }

    // Description length validation
    if (this.description && this.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    // Credits validation
    if (this.credits !== null && (!Number.isInteger(this.credits) || this.credits < 0 || this.credits > 10)) {
      errors.push('Credits must be between 0 and 10');
    }

    // Type validation
    const validTypes = ['core', 'elective', 'mandatory', 'optional'];
    if (this.type && !validTypes.includes(this.type)) {
      errors.push(`Type must be one of: ${validTypes.join(', ')}`);
    }

    // Level validation
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    if (this.level && !validLevels.includes(this.level)) {
      errors.push(`Level must be one of: ${validLevels.join(', ')}`);
    }

    // Prerequisites array validation
    if (!Array.isArray(this.prerequisites)) {
      errors.push('Prerequisites must be an array');
    }

    // Teachers array validation
    if (!Array.isArray(this.teachers)) {
      errors.push('Teachers must be an array');
    }

    // Grade range validation
    if (this.gradeRange) {
      if (!this.gradeRange.min || !this.gradeRange.max) {
        errors.push('Grade range must have min and max values');
      } else if (this.gradeRange.min < 1 || this.gradeRange.max > 12) {
        errors.push('Grade range must be between 1 and 12');
      } else if (this.gradeRange.min > this.gradeRange.max) {
        errors.push('Grade range min cannot be greater than max');
      }
    }

    // Hours validation
    if (this.practicalHours < 0 || this.theoryHours < 0) {
      errors.push('Hours cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if subject is applicable to a specific grade
   */
  isApplicableToGrade(grade) {
    if (!this.gradeRange) return true;
    return grade >= this.gradeRange.min && grade <= this.gradeRange.max;
  }

  /**
   * Add teacher to subject
   */
  addTeacher(teacherId) {
    if (!Number.isInteger(teacherId)) {
      throw new Error('Teacher ID must be a valid integer');
    }

    if (!this.teachers.includes(teacherId)) {
      this.teachers.push(teacherId);
      this.updatedAt = new Date().toISOString();
    }

    return this;
  }

  /**
   * Remove teacher from subject
   */
  removeTeacher(teacherId) {
    const initialLength = this.teachers.length;
    this.teachers = this.teachers.filter(id => id !== teacherId);

    if (this.teachers.length < initialLength) {
      this.updatedAt = new Date().toISOString();
    }

    return this;
  }

  /**
   * Check if teacher teaches this subject
   */
  hasTeacher(teacherId) {
    return this.teachers.includes(teacherId);
  }

  /**
   * Get teacher count
   */
  getTeacherCount() {
    return this.teachers.length;
  }

  /**
   * Add prerequisite subject
   */
  addPrerequisite(subjectId) {
    if (!Number.isInteger(subjectId)) {
      throw new Error('Subject ID must be a valid integer');
    }

    // Prevent circular prerequisites
    if (subjectId === this.id) {
      throw new Error('Subject cannot be a prerequisite of itself');
    }

    if (!this.prerequisites.includes(subjectId)) {
      this.prerequisites.push(subjectId);
      this.updatedAt = new Date().toISOString();
    }

    return this;
  }

  /**
   * Remove prerequisite subject
   */
  removePrerequisite(subjectId) {
    const initialLength = this.prerequisites.length;
    this.prerequisites = this.prerequisites.filter(id => id !== subjectId);

    if (this.prerequisites.length < initialLength) {
      this.updatedAt = new Date().toISOString();
    }

    return this;
  }

  /**
   * Check if subject has prerequisites
   */
  hasPrerequisites() {
    return this.prerequisites.length > 0;
  }

  /**
   * Check if a specific subject is a prerequisite
   */
  isPrerequisite(subjectId) {
    return this.prerequisites.includes(subjectId);
  }

  /**
   * Add resource
   */
  addResource(resource) {
    if (!resource.title || !resource.url) {
      throw new Error('Resource must have title and url');
    }

    this.resources.push({
      id: this.generateResourceId(),
      title: resource.title,
      url: resource.url,
      type: resource.type || 'link', // link, pdf, video, document
      description: resource.description || '',
      addedAt: new Date().toISOString()
    });

    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Remove resource
   */
  removeResource(resourceId) {
    const initialLength = this.resources.length;
    this.resources = this.resources.filter(r => r.id !== resourceId);

    if (this.resources.length < initialLength) {
      this.updatedAt = new Date().toISOString();
    }

    return this;
  }

  /**
   * Get total weekly hours
   */
  getTotalWeeklyHours() {
    return this.practicalHours + this.theoryHours;
  }

  /**
   * Update metadata
   */
  updateMetadata(updates) {
    this.metadata = {
      ...this.metadata,
      ...updates
    };

    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Set grade range
   */
  setGradeRange(min, max) {
    if (min < 1 || max > 12 || min > max) {
      throw new Error('Invalid grade range');
    }

    this.gradeRange = { min, max };
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Archive subject
   */
  archive() {
    this.isActive = false;
    this.archivedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Restore archived subject
   */
  restore() {
    this.isActive = true;
    delete this.archivedAt;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Generate unique resource ID
   */
  generateResourceId() {
    const maxId = this.resources.reduce((max, resource) => 
      Math.max(max, resource.id || 0), 0
    );
    return maxId + 1;
  }

  /**
   * Get subject statistics
   */
  getStatistics() {
    return {
      teacherCount: this.teachers.length,
      prerequisiteCount: this.prerequisites.length,
      resourceCount: this.resources.length,
      totalWeeklyHours: this.getTotalWeeklyHours(),
      hasPrerequisites: this.hasPrerequisites(),
      isPractical: this.isPractical,
      credits: this.credits,
      gradeRange: this.gradeRange,
      isActive: this.isActive
    };
  }

  /**
   * Get full subject name with code
   */
  getFullName() {
    return `${this.code} - ${this.name}`;
  }

  /**
   * Convert to plain object (for JSON response)
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      fullName: this.getFullName(),
      description: this.description,
      department: this.department,
      credits: this.credits,
      type: this.type,
      level: this.level,
      prerequisites: this.prerequisites,
      teachers: this.teachers,
      gradeRange: this.gradeRange,
      syllabus: this.syllabus,
      resources: this.resources,
      isPractical: this.isPractical,
      practicalHours: this.practicalHours,
      theoryHours: this.theoryHours,
      totalWeeklyHours: this.getTotalWeeklyHours(),
      metadata: this.metadata,
      isActive: this.isActive,
      statistics: this.getStatistics(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to summary object (minimal info)
   */
  toSummaryJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      fullName: this.getFullName(),
      department: this.department,
      type: this.type,
      credits: this.credits,
      isActive: this.isActive,
      isPractical: this.isPractical
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row) {
    return new Subject({
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      department: row.department,
      credits: row.credits,
      type: row.type,
      level: row.level,
      prerequisites: typeof row.prerequisites === 'string'
        ? JSON.parse(row.prerequisites)
        : row.prerequisites || [],
      teachers: typeof row.teachers === 'string'
        ? JSON.parse(row.teachers)
        : row.teachers || [],
      gradeRange: typeof row.grade_range === 'string'
        ? JSON.parse(row.grade_range)
        : row.gradeRange || row.grade_range || { min: 1, max: 12 },
      syllabus: row.syllabus,
      resources: typeof row.resources === 'string'
        ? JSON.parse(row.resources)
        : row.resources || [],
      isActive: row.is_active !== undefined ? row.is_active : row.isActive !== undefined ? row.isActive : true,
      isPractical: row.is_practical !== undefined ? row.is_practical : row.isPractical || false,
      practicalHours: row.practical_hours || row.practicalHours || 0,
      theoryHours: row.theory_hours || row.theoryHours || 0,
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
      code: this.code,
      description: this.description,
      department: this.department,
      credits: this.credits,
      type: this.type,
      level: this.level,
      prerequisites: JSON.stringify(this.prerequisites),
      teachers: JSON.stringify(this.teachers),
      grade_range: JSON.stringify(this.gradeRange),
      syllabus: this.syllabus,
      resources: JSON.stringify(this.resources),
      is_active: this.isActive,
      is_practical: this.isPractical,
      practical_hours: this.practicalHours,
      theory_hours: this.theoryHours,
      metadata: JSON.stringify(this.metadata),
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Clone this subject
   */
  clone() {
    return new Subject({
      name: this.name,
      code: this.code + '_COPY',
      description: this.description,
      department: this.department,
      credits: this.credits,
      type: this.type,
      level: this.level,
      prerequisites: [...this.prerequisites],
      gradeRange: { ...this.gradeRange },
      isPractical: this.isPractical,
      practicalHours: this.practicalHours,
      theoryHours: this.theoryHours,
      metadata: { ...this.metadata }
    });
  }

  /**
   * Merge with updated data
   */
  merge(updateData) {
    const allowedFields = ['name', 'code', 'description', 'department', 'credits',
                          'type', 'level', 'gradeRange', 'syllabus', 'isPractical',
                          'practicalHours', 'theoryHours'];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        this[field] = updateData[field];
      }
    });

    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Compare with another subject
   */
  equals(otherSubject) {
    if (!(otherSubject instanceof Subject)) return false;

    return (
      this.code === otherSubject.code &&
      this.name === otherSubject.name
    );
  }
}

/**
 * Static factory methods
 */

/**
 * Create a new subject
 */
Subject.create = function(data) {
  const subject = new Subject(data);
  const validation = subject.validate();

  if (!validation.isValid) {
    throw new Error('Invalid subject data: ' + validation.errors.join(', '));
  }

  return subject;
};

/**
 * Create multiple subjects
 */
Subject.createBatch = function(dataArray) {
  return dataArray.map(data => Subject.create(data));
};

/**
 * Get database schema for migration
 */
Subject.getSchema = function() {
  return {
    tableName: 'subjects',
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'VARCHAR(100) NOT NULL',
      code: 'VARCHAR(10) NOT NULL UNIQUE',
      description: 'TEXT',
      department: 'VARCHAR(50)',
      credits: 'INTEGER DEFAULT 1',
      type: 'VARCHAR(20) DEFAULT "core"',
      level: 'VARCHAR(20)',
      prerequisites: 'TEXT', // JSON array
      teachers: 'TEXT', // JSON array
      grade_range: 'TEXT', // JSON object
      syllabus: 'TEXT',
      resources: 'TEXT', // JSON array
      is_active: 'BOOLEAN DEFAULT 1',
      is_practical: 'BOOLEAN DEFAULT 0',
      practical_hours: 'INTEGER DEFAULT 0',
      theory_hours: 'INTEGER DEFAULT 0',
      metadata: 'TEXT', // JSON object
      created_at: 'DATETIME NOT NULL',
      updated_at: 'DATETIME NOT NULL',
      archived_at: 'DATETIME'
    },
    indexes: [
      'CREATE INDEX idx_subjects_code ON subjects(code)',
      'CREATE INDEX idx_subjects_department ON subjects(department)',
      'CREATE INDEX idx_subjects_type ON subjects(type)',
      'CREATE INDEX idx_subjects_active ON subjects(is_active)',
      'CREATE INDEX idx_subjects_name ON subjects(name)'
    ]
  };
};

/**
 * Get validation rules
 */
Subject.getValidationRules = function() {
  return {
    name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100
    },
    code: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 10,
      pattern: '^[A-Z0-9]+$'
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 1000
    },
    credits: {
      type: 'integer',
      required: false,
      default: 1,
      min: 0,
      max: 10
    },
    type: {
      type: 'string',
      required: false,
      enum: ['core', 'elective', 'mandatory', 'optional']
    },
    level: {
      type: 'string',
      required: false,
      enum: ['beginner', 'intermediate', 'advanced']
    }
  };
};

/**
 * Get predefined subject types
 */
Subject.getTypes = function() {
  return [
    { value: 'core', label: 'Core Subject', description: 'Mandatory for all students' },
    { value: 'elective', label: 'Elective', description: 'Optional choice for students' },
    { value: 'mandatory', label: 'Mandatory', description: 'Required for specific streams' },
    { value: 'optional', label: 'Optional', description: 'Completely optional' }
  ];
};

/**
 * Get predefined subject levels
 */
Subject.getLevels = function() {
  return [
    { value: 'beginner', label: 'Beginner', description: 'Introductory level' },
    { value: 'intermediate', label: 'Intermediate', description: 'Mid-level complexity' },
    { value: 'advanced', label: 'Advanced', description: 'Advanced/honors level' }
  ];
};

/**
 * Get common departments
 */
Subject.getDepartments = function() {
  return [
    'Science',
    'Mathematics',
    'Languages',
    'Social Sciences',
    'Arts',
    'Physical Education',
    'Computer Science',
    'Commerce',
    'Vocational'
  ];
};

// Export the model
module.exports = Subject;