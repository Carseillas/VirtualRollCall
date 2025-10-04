// backend/controllers/classController.js - Class Management Controller
const {
  getAllClasses,
  findClassById,
  createClass,
  updateClass,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  findStudentById,
  searchStudents,
  searchClasses
} = require('../utils/database');

/**
 * Get all classes
 */
const getClasses = async (req, res) => {
  try {
    const { page = 1, limit = 10, grade, search, includeStudents = 'true', teacherId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get classes based on user role
    let classes = getAllClasses();

    // For teachers, filter to only classes they teach
    if (userRole === 'teacher') {
      const { getTeacherSchedule } = require('../utils/database');
      const schedule = getTeacherSchedule(userId);
      const teacherClassIds = [...new Set(schedule.map(s => s.classId))];

      classes = classes.filter(cls =>
        teacherClassIds.includes(cls.id) || cls.classTeacher === userId
      );
    }

    // Apply filters
    if (grade) {
      classes = classes.filter(cls => cls.grade === parseInt(grade));
    }

    if (teacherId) {
      classes = classes.filter(cls => cls.classTeacher === parseInt(teacherId));
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
    let responseClasses = paginatedClasses.map(cls => ({
      ...cls,
      activeStudents: cls.students?.filter(s => s.isActive).length || 0
    }));

    if (includeStudents === 'false') {
      responseClasses = responseClasses.map(cls => ({
        ...cls,
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
        pages: Math.ceil(classes.length / limitNum),
        hasNext: endIndex < classes.length,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve classes',
      code: 'CLASSES_FETCH_ERROR'
    });
  }
};

/**
 * Get specific class by ID
 */
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeInactiveStudents = 'false' } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const classId = parseInt(id);
    if (isNaN(classId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }

    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Check access for teachers
    if (userRole === 'teacher') {
      const { getTeacherSchedule } = require('../utils/database');
      const schedule = getTeacherSchedule(userId);
      const hasAccess = schedule.some(s => s.classId === classId) ||
                       classData.classTeacher === userId;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }
    }

    // Filter students
    const filteredClass = {
      ...classData,
      students: includeInactiveStudents === 'true'
        ? classData.students
        : classData.students.filter(s => s.isActive),
      activeStudents: classData.students.filter(s => s.isActive).length,
      inactiveStudents: classData.students.filter(s => !s.isActive).length
    };

    res.json({
      success: true,
      data: filteredClass
    });

  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve class',
      code: 'CLASS_FETCH_ERROR'
    });
  }
};

/**
 * Create new class (Principal only)
 */
const addClass = async (req, res) => {
  try {
    const { name, grade, section = 'A', classTeacher, maxStudents = 35, students = [] } = req.body;

    // Validation
    const errors = [];
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      errors.push('Class name is required');
    }
    if (!grade || !Number.isInteger(grade) || grade < 1 || grade > 12) {
      errors.push('Grade must be between 1 and 12');
    }
    if (maxStudents < 1 || maxStudents > 50) {
      errors.push('Maximum students must be between 1 and 50');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
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
        success: false,
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
          success: false,
          error: 'Invalid class teacher',
          code: 'INVALID_TEACHER'
        });
      }
    }

    // Validate and process students
    const processedStudents = [];
    for (const [index, student] of students.entries()) {
      const studentErrors = [];

      if (!student.name || student.name.length < 2) {
        studentErrors.push(`Student ${index + 1}: Name is required`);
      }
      if (!student.studentId || student.studentId.length < 3) {
        studentErrors.push(`Student ${index + 1}: Student ID is required`);
      }
      if (student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
        studentErrors.push(`Student ${index + 1}: Invalid email format`);
      }

      if (studentErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid student data',
          code: 'INVALID_STUDENT_DATA',
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

    // Check if adding students exceeds max capacity
    if (processedStudents.length > maxStudents) {
      return res.status(400).json({
        success: false,
        error: `Cannot add ${processedStudents.length} students. Maximum capacity is ${maxStudents}`,
        code: 'EXCEEDS_CAPACITY'
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
      success: false,
      error: 'Failed to create class',
      code: 'CLASS_CREATE_ERROR'
    });
  }
};

/**
 * Update class (Principal only)
 */
const updateClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, section, classTeacher, maxStudents } = req.body;

    const classId = parseInt(id);
    if (isNaN(classId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }

    const existingClass = findClassById(classId);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
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
          success: false,
          error: 'Invalid class teacher',
          code: 'INVALID_TEACHER'
        });
      }
    }

    // Check if new name conflicts with existing class
    if (name && name !== existingClass.name) {
      const conflictClass = getAllClasses().find(cls =>
        cls.id !== classId &&
        cls.name.toLowerCase() === name.toLowerCase().trim() &&
        cls.grade === (grade || existingClass.grade) &&
        cls.isActive
      );

      if (conflictClass) {
        return res.status(409).json({
          success: false,
          error: 'A class with this name already exists for this grade',
          code: 'CLASS_NAME_EXISTS'
        });
      }
    }

    // Check if reducing maxStudents below current student count
    if (maxStudents && maxStudents < existingClass.students.filter(s => s.isActive).length) {
      return res.status(400).json({
        success: false,
        error: `Cannot reduce capacity below current student count (${existingClass.students.filter(s => s.isActive).length})`,
        code: 'INVALID_CAPACITY'
      });
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
      success: false,
      error: 'Failed to update class',
      code: 'CLASS_UPDATE_ERROR'
    });
  }
};

/**
 * Delete class (Principal only)
 */
const deleteClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classId = parseInt(id);
    if (isNaN(classId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }

    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Check if class has attendance records
    const { getAttendanceRecords } = require('../utils/database');
    const attendanceRecords = getAttendanceRecords({ classId });

    if (attendanceRecords.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete class with existing attendance records',
        code: 'HAS_ATTENDANCE_RECORDS',
        details: {
          attendanceCount: attendanceRecords.length
        }
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
        success: false,
        error: 'Failed to delete class',
        code: 'CLASS_DELETE_ERROR'
      });
    }

  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete class',
      code: 'CLASS_DELETE_ERROR'
    });
  }
};

/**
 * Add student to class (Principal only)
 */
const addStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, studentId, email, dateOfBirth, parentContact } = req.body;

    const classId = parseInt(id);
    if (isNaN(classId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }

    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Validate student data
    const errors = [];
    if (!name || name.length < 2) {
      errors.push('Student name is required (minimum 2 characters)');
    }
    if (!studentId || studentId.length < 3) {
      errors.push('Student ID is required (minimum 3 characters)');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }
    if (parentContact && !/^\+?[\d\s\-\(\)]{10,}$/.test(parentContact)) {
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

    // Check if student ID already exists in this class
    const existingStudent = classData.students.find(s =>
      s.studentId === studentId.trim() && s.isActive
    );

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        error: 'Student ID already exists in this class',
        code: 'STUDENT_EXISTS'
      });
    }

    // Check class capacity
    const activeStudents = classData.students.filter(s => s.isActive).length;
    if (activeStudents >= classData.maxStudents) {
      return res.status(400).json({
        success: false,
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
      success: false,
      error: 'Failed to add student',
      code: 'STUDENT_ADD_ERROR'
    });
  }
};

/**
 * Remove student from class (Principal only)
 */
const removeStudent = async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const classIdNum = parseInt(classId);
    const studentIdNum = parseInt(studentId);

    if (isNaN(classIdNum) || isNaN(studentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID or student ID',
        code: 'INVALID_ID'
      });
    }

    const classData = findClassById(classIdNum);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    const student = classData.students.find(s => s.id === studentIdNum);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found in this class',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const success = removeStudentFromClass(classIdNum, studentIdNum);

    if (success) {
      console.log(`👥 Student removed: ${student.name} from ${classData.name} by ${req.user.name}`);
      res.json({
        success: true,
        message: 'Student removed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to remove student',
        code: 'STUDENT_REMOVE_ERROR'
      });
    }

  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove student',
      code: 'STUDENT_REMOVE_ERROR'
    });
  }
};

/**
 * Get students in a class
 */
const getClassStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { active = 'true' } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const classId = parseInt(id);
    if (isNaN(classId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }

    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Check access for teachers
    if (userRole === 'teacher') {
      const { getTeacherSchedule } = require('../utils/database');
      const schedule = getTeacherSchedule(userId);
      const hasAccess = schedule.some(s => s.classId === classId) ||
                       classData.classTeacher === userId;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
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
        totalStudents: students.length,
        activeStudents: students.filter(s => s.isActive).length,
        inactiveStudents: students.filter(s => !s.isActive).length
      }
    });

  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve students',
      code: 'STUDENTS_FETCH_ERROR'
    });
  }
};

/**
 * Search students across all classes
 */
const searchAllStudents = async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
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
      success: false,
      error: 'Failed to search students',
      code: 'SEARCH_ERROR'
    });
  }
};

/**
 * Get class statistics (Principal only)
 */
const getClassStatistics = async (req, res) => {
  try {
    const classes = getAllClasses();

    const stats = {
      totalClasses: classes.filter(c => c.isActive).length,
      totalStudents: 0,
      averageClassSize: 0,
      totalCapacity: 0,
      capacityUtilization: 0,
      gradeDistribution: {},
      teacherAssignments: {}
    };

    classes.forEach(cls => {
      if (cls.isActive) {
        const activeStudents = cls.students.filter(s => s.isActive).length;
        stats.totalStudents += activeStudents;
        stats.totalCapacity += cls.maxStudents;

        // Grade distribution
        if (!stats.gradeDistribution[cls.grade]) {
          stats.gradeDistribution[cls.grade] = {
            classes: 0,
            students: 0,
            capacity: 0
          };
        }
        stats.gradeDistribution[cls.grade].classes++;
        stats.gradeDistribution[cls.grade].students += activeStudents;
        stats.gradeDistribution[cls.grade].capacity += cls.maxStudents;

        // Teacher assignments
        if (cls.classTeacher) {
          if (!stats.teacherAssignments[cls.classTeacher]) {
            stats.teacherAssignments[cls.classTeacher] = {
              classes: 0,
              students: 0
            };
          }
          stats.teacherAssignments[cls.classTeacher].classes++;
          stats.teacherAssignments[cls.classTeacher].students += activeStudents;
        }
      }
    });

    if (stats.totalClasses > 0) {
      stats.averageClassSize = Math.round(stats.totalStudents / stats.totalClasses);
    }

    if (stats.totalCapacity > 0) {
      stats.capacityUtilization = Math.round((stats.totalStudents / stats.totalCapacity) * 100);
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get class statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      code: 'STATISTICS_ERROR'
    });
  }
};

/**
 * Update student information (Principal only)
 */
const updateStudent = async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    const { name, email, dateOfBirth, parentContact } = req.body;

    const classIdNum = parseInt(classId);
    const studentIdNum = parseInt(studentId);

    if (isNaN(classIdNum) || isNaN(studentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID or student ID',
        code: 'INVALID_ID'
      });
    }

    const classData = findClassById(classIdNum);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    const studentIndex = classData.students.findIndex(s => s.id === studentIdNum);
    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Update student
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (parentContact !== undefined) updateData.parentContact = parentContact.trim();

    classData.students[studentIndex] = {
      ...classData.students[studentIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    updateClass(classIdNum, { students: classData.students });

    console.log(`👥 Student updated: ${classData.students[studentIndex].name} by ${req.user.name}`);

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: classData.students[studentIndex]
    });

  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update student',
      code: 'STUDENT_UPDATE_ERROR'
    });
  }
};

module.exports = {
  getClasses,
  getClassById,
  addClass,
  updateClassById,
  deleteClassById,
  addStudent,
  removeStudent,
  getClassStudents,
  searchAllStudents,
  getClassStatistics,
  updateStudent
};