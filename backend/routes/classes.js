// backend/routes/classes.js - Classes Management Routes
const express = require('express');
const {
  getAllClasses,
  findClassById,
  createClass,
  updateClass,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  findStudentById,
  searchStudents
} = require('../utils/database');
const {
  requirePrincipal,
  requireTeacherOrPrincipal
} = require('../middleware/auth');

const router = express.Router();

// Utility functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// GET /api/classes - Get all classes
router.get('/', requireTeacherOrPrincipal, (req, res) => {
  try {
    const { page = 1, limit = 10, grade, search, includeStudents = 'true' } = req.query;
    
    // Get classes based on user role
    let classes = getAllClasses();
    
    // For teachers, filter to only classes they teach
    if (req.user.role === 'teacher') {
      classes = classes.filter(cls => 
        cls.classTeacher === req.user.id ||
        req.user.subjects?.some(subjectId => 
          cls.subjects?.includes(subjectId)
        )
      );
    }
    
    // Apply filters
    if (grade) {
      classes = classes.filter(cls => cls.grade === parseInt(grade));
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      classes = classes.filter(cls =>
        cls.name.toLowerCase().includes(searchTerm) ||
        cls.grade.toString().includes(searchTerm) ||
        cls.section?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedClasses = classes.slice(startIndex, endIndex);
    
    // Format response
    let responseClasses = paginatedClasses;
    if (includeStudents === 'false') {
      responseClasses = responseClasses.map(cls => ({
        ...cls,
        studentCount: cls.students?.filter(s => s.isActive).length || 0,
        students: undefined
      }));
    }
    
    res.json({
      success: true,
      data: responseClasses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: classes.length,
        pages: Math.ceil(classes.length / limitNum)
      }
    });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      error: 'Failed to retrieve classes',
      code: 'CLASSES_FETCH_ERROR'
    });
  }
});

// GET /api/classes/:id - Get specific class
router.get('/:id', requireTeacherOrPrincipal, (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    
    if (isNaN(classId)) {
      return res.status(400).json({
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }
    
    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }
    
    // Check access for teachers
    if (req.user.role === 'teacher') {
      const hasAccess = classData.classTeacher === req.user.id ||
                       req.user.subjects?.some(subjectId => 
                         classData.subjects?.includes(subjectId)
                       );
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }
    }
    
    res.json({
      success: true,
      data: classData
    });

  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({
      error: 'Failed to retrieve class',
      code: 'CLASS_FETCH_ERROR'
    });
  }
});

// POST /api/classes - Create new class (Principal only)
router.post('/', requirePrincipal, (req, res) => {
  try {
    const { name, grade, section = 'A', classTeacher, maxStudents = 35, students = [] } = req.body;
    
    // Validation
    const errors = [];
    if (!name || name.trim().length < 1) {
      errors.push('Class name is required');
    }
    if (!grade || grade < 1 || grade > 12) {
      errors.push('Grade must be between 1 and 12');
    }
    if (maxStudents < 1 || maxStudents > 50) {
      errors.push('Maximum students must be between 1 and 50');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    // Check if class already exists
    const existingClass = getAllClasses().find(cls => 
      cls.name.toLowerCase() === name.toLowerCase().trim() && 
      cls.grade === grade &&
      cls.isActive
    );
    
    if (existingClass) {
      return res.status(409).json({
        error: `Class ${name} already exists for grade ${grade}`,
        code: 'CLASS_EXISTS'
      });
    }
    
    // Validate class teacher if provided
    if (classTeacher) {
      const { findUserById } = require('../utils/database');
      const teacher = findUserById(classTeacher);
      if (!teacher || teacher.role !== 'teacher' || !teacher.isActive) {
        return res.status(400).json({
          error: 'Invalid class teacher',
          code: 'INVALID_TEACHER'
        });
      }
    }
    
    // Process students
    const processedStudents = [];
    for (const [index, student] of students.entries()) {
      const studentErrors = [];
      
      if (!student.name || student.name.length < 2) {
        studentErrors.push('Student name is required');
      }
      if (!student.studentId || student.studentId.length < 3) {
        studentErrors.push('Student ID is required');
      }
      if (student.email && !isValidEmail(student.email)) {
        studentErrors.push('Invalid email format');
      }
      
      if (studentErrors.length > 0) {
        return res.status(400).json({
          error: `Invalid student data at index ${index}`,
          details: studentErrors
        });
      }
      
      processedStudents.push({
        ...student,
        name: student.name.trim(),
        studentId: student.studentId.trim(),
        email: student.email?.toLowerCase().trim(),
        parentContact: student.parentContact?.trim(),
        isActive: true
      });
    }
    
    // Create class
    const classData = {
      name: name.trim(),
      grade,
      section: section.trim(),
      classTeacher,
      maxStudents,
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      students: processedStudents
    };
    
    const newClass = createClass(classData);
    
    console.log(`🏫 Class created: ${newClass.name} by ${req.user.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass
    });

  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({
      error: 'Failed to create class',
      code: 'CLASS_CREATE_ERROR'
    });
  }
});

// PUT /api/classes/:id - Update class (Principal only)
router.put('/:id', requirePrincipal, (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { name, grade, section, classTeacher, maxStudents } = req.body;
    
    if (isNaN(classId)) {
      return res.status(400).json({
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }
    
    const existingClass = findClassById(classId);
    if (!existingClass) {
      return res.status(404).json({
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }
    
    // Validate class teacher if provided
    if (classTeacher) {
      const { findUserById } = require('../utils/database');
      const teacher = findUserById(classTeacher);
      if (!teacher || teacher.role !== 'teacher' || !teacher.isActive) {
        return res.status(400).json({
          error: 'Invalid class teacher',
          code: 'INVALID_TEACHER'
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (grade !== undefined) updateData.grade = grade;
    if (section !== undefined) updateData.section = section.trim();
    if (classTeacher !== undefined) updateData.classTeacher = classTeacher;
    if (maxStudents !== undefined) updateData.maxStudents = maxStudents;
    
    const updatedClass = updateClass(classId, updateData);
    
    console.log(`🏫 Class updated: ${updatedClass.name} by ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass
    });

  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      error: 'Failed to update class',
      code: 'CLASS_UPDATE_ERROR'
    });
  }
});

// DELETE /api/classes/:id - Delete class (Principal only)
router.delete('/:id', requirePrincipal, (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    
    if (isNaN(classId)) {
      return res.status(400).json({
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }
    
    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }
    
    const success = deleteClass(classId);
    
    if (success) {
      console.log(`🗑️ Class deleted: ${classData.name} by ${req.user.name}`);
      res.json({
        success: true,
        message: 'Class deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete class',
        code: 'CLASS_DELETE_ERROR'
      });
    }

  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      error: 'Failed to delete class',
      code: 'CLASS_DELETE_ERROR'
    });
  }
});

// POST /api/classes/:id/students - Add student to class (Principal only)
router.post('/:id/students', requirePrincipal, (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { name, studentId, email, dateOfBirth, parentContact } = req.body;
    
    if (isNaN(classId)) {
      return res.status(400).json({
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }
    
    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }
    
    // Validate student data
    const errors = [];
    if (!name || name.length < 2) {
      errors.push('Student name is required and must be at least 2 characters');
    }
    if (!studentId || studentId.length < 3) {
      errors.push('Student ID is required and must be at least 3 characters');
    }
    if (email && !isValidEmail(email)) {
      errors.push('Invalid email format');
    }
    if (parentContact && !isValidPhone(parentContact)) {
      errors.push('Invalid phone format');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    // Check if student ID already exists in this class
    const existingStudent = classData.students.find(s => 
      s.studentId === studentId.trim() && s.isActive
    );
    
    if (existingStudent) {
      return res.status(409).json({
        error: 'Student ID already exists in this class',
        code: 'STUDENT_EXISTS'
      });
    }
    
    // Check class capacity
    const activeStudents = classData.students.filter(s => s.isActive).length;
    if (activeStudents >= classData.maxStudents) {
      return res.status(400).json({
        error: `Class has reached maximum capacity of ${classData.maxStudents} students`,
        code: 'CLASS_FULL'
      });
    }
    
    // Add student
    const studentData = {
      name: name.trim(),
      studentId: studentId.trim(),
      email: email?.toLowerCase().trim(),
      dateOfBirth,
      parentContact: parentContact?.trim()
    };
    
    const newStudent = addStudentToClass(classId, studentData);
    
    console.log(`👥 Student added: ${newStudent.name} to ${classData.name} by ${req.user.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: newStudent
    });

  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({
      error: 'Failed to add student',
      code: 'STUDENT_ADD_ERROR'
    });
  }
});

// DELETE /api/classes/:classId/students/:studentId - Remove student from class (Principal only)
router.delete('/:classId/students/:studentId', requirePrincipal, (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const studentId = parseInt(req.params.studentId);
    
    if (isNaN(classId) || isNaN(studentId)) {
      return res.status(400).json({
        error: 'Invalid class ID or student ID',
        code: 'INVALID_ID'
      });
    }
    
    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }
    
    const student = classData.students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({
        error: 'Student not found in this class',
        code: 'STUDENT_NOT_FOUND'
      });
    }
    
    const success = removeStudentFromClass(classId, studentId);
    
    if (success) {
      console.log(`👥 Student removed: ${student.name} from ${classData.name} by ${req.user.name}`);
      res.json({
        success: true,
        message: 'Student removed successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to remove student',
        code: 'STUDENT_REMOVE_ERROR'
      });
    }

  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      error: 'Failed to remove student',
      code: 'STUDENT_REMOVE_ERROR'
    });
  }
});

// GET /api/classes/:id/students - Get students in a class
router.get('/:id/students', requireTeacherOrPrincipal, (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { active = 'true' } = req.query;
    
    if (isNaN(classId)) {
      return res.status(400).json({
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }
    
    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }
    
    // Check access for teachers
    if (req.user.role === 'teacher') {
      const hasAccess = classData.classTeacher === req.user.id ||
                       req.user.subjects?.some(subjectId => 
                         classData.subjects?.includes(subjectId)
                       );
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }
    }
    
    // Filter students based on active status
    let students = classData.students;
    if (active === 'true') {
      students = students.filter(s => s.isActive);
    }
    
    res.json({
      success: true,
      data: students,
      meta: {
        classId,
        className: classData.name,
        totalStudents: students.length
      }
    });

  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({
      error: 'Failed to retrieve students',
      code: 'STUDENTS_FETCH_ERROR'
    });
  }
});

// GET /api/classes/search/students - Search students across all classes
router.get('/search/students', requireTeacherOrPrincipal, (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters',
        code: 'INVALID_QUERY'
      });
    }
    
    const students = searchStudents(query.trim());
    
    // Limit results
    const limitedStudents = students.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: limitedStudents,
      meta: {
        query: query.trim(),
        totalResults: students.length,
        displayed: limitedStudents.length
      }
    });

  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({
      error: 'Failed to search students',
      code: 'SEARCH_ERROR'
    });
  }
});

// GET /api/classes/stats - Get class statistics (Principal only)
router.get('/stats', requirePrincipal, (req, res) => {
  try {
    const classes = getAllClasses();
    
    const stats = {
      totalClasses: classes.filter(c => c.isActive).length,
      totalStudents: 0,
      averageClassSize: 0,
      gradeDistribution: {},
      capacityUtilization: 0
    };
    
    let totalCapacity = 0;
    
    classes.forEach(cls => {
      if (cls.isActive) {
        const activeStudents = cls.students.filter(s => s.isActive).length;
        stats.totalStudents += activeStudents;
        totalCapacity += cls.maxStudents;
        
        if (!stats.gradeDistribution[cls.grade]) {
          stats.gradeDistribution[cls.grade] = {
            classes: 0,
            students: 0
          };
        }
        
        stats.gradeDistribution[cls.grade].classes++;
        stats.gradeDistribution[cls.grade].students += activeStudents;
      }
    });
    
    if (stats.totalClasses > 0) {
      stats.averageClassSize = Math.round(stats.totalStudents / stats.totalClasses);
      stats.capacityUtilization = Math.round((stats.totalStudents / totalCapacity) * 100);
    }
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get class stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;