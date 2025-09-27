// backend/routes/subjects.js - Subjects Management Routes
const express = require('express');
const {
  getAllSubjects,
  findSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../utils/database');
const {
  requirePrincipal,
  requireTeacherOrPrincipal
} = require('../middleware/auth');

const router = express.Router();

// GET /api/subjects - Get all subjects
router.get('/', requireTeacherOrPrincipal, (req, res) => {
  try {
    const { search, code } = req.query;
    
    // Build filters
    const filters = {};
    if (code) filters.code = code;
    
    let subjects = getAllSubjects(filters);
    
    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      subjects = subjects.filter(subject =>
        subject.name.toLowerCase().includes(searchTerm) ||
        subject.code.toLowerCase().includes(searchTerm) ||
        subject.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    res.json({
      success: true,
      data: subjects,
      meta: {
        total: subjects.length
      }
    });

  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      error: 'Failed to retrieve subjects',
      code: 'SUBJECTS_FETCH_ERROR'
    });
  }
});

// GET /api/subjects/:id - Get specific subject
router.get('/:id', requireTeacherOrPrincipal, (req, res) => {
  try {
    const subjectId = parseInt(req.params.id);
    
    if (isNaN(subjectId)) {
      return res.status(400).json({
        error: 'Invalid subject ID',
        code: 'INVALID_ID'
      });
    }
    
    const subject = findSubjectById(subjectId);
    if (!subject) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: subject
    });

  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({
      error: 'Failed to retrieve subject',
      code: 'SUBJECT_FETCH_ERROR'
    });
  }
});

// POST /api/subjects - Create new subject (Principal only)
router.post('/', requirePrincipal, (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    // Validation
    const errors = [];
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Subject name is required and must be at least 2 characters');
    }
    if (!code || typeof code !== 'string' || code.trim().length < 2) {
      errors.push('Subject code is required and must be at least 2 characters');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    // Check if subject with same name or code already exists
    const subjects = getAllSubjects();
    const existingByName = subjects.find(s => 
      s.name.toLowerCase() === name.toLowerCase().trim()
    );
    const existingByCode = subjects.find(s => 
      s.code.toLowerCase() === code.toLowerCase().trim()
    );
    
    if (existingByName) {
      return res.status(409).json({
        error: 'Subject with this name already exists',
        code: 'SUBJECT_NAME_EXISTS'
      });
    }
    
    if (existingByCode) {
      return res.status(409).json({
        error: 'Subject with this code already exists',
        code: 'SUBJECT_CODE_EXISTS'
      });
    }
    
    // Create subject
    const subjectData = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || ''
    };
    
    const newSubject = createSubject(subjectData);
    
    console.log(`📚 Subject created: ${newSubject.name} (${newSubject.code}) by ${req.user.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: newSubject
    });

  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({
      error: 'Failed to create subject',
      code: 'SUBJECT_CREATE_ERROR'
    });
  }
});

// PUT /api/subjects/:id - Update subject (Principal only)
router.put('/:id', requirePrincipal, (req, res) => {
  try {
    const subjectId = parseInt(req.params.id);
    const { name, code, description } = req.body;
    
    if (isNaN(subjectId)) {
      return res.status(400).json({
        error: 'Invalid subject ID',
        code: 'INVALID_ID'
      });
    }
    
    const existingSubject = findSubjectById(subjectId);
    if (!existingSubject) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }
    
    // Validation
    const errors = [];
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      errors.push('Subject name must be at least 2 characters');
    }
    if (code !== undefined && (typeof code !== 'string' || code.trim().length < 2)) {
      errors.push('Subject code must be at least 2 characters');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    // Check for conflicts with other subjects
    const subjects = getAllSubjects();
    
    if (name && name.toLowerCase().trim() !== existingSubject.name.toLowerCase()) {
      const existingByName = subjects.find(s => 
        s.id !== subjectId && s.name.toLowerCase() === name.toLowerCase().trim()
      );
      if (existingByName) {
        return res.status(409).json({
          error: 'Subject with this name already exists',
          code: 'SUBJECT_NAME_EXISTS'
        });
      }
    }
    
    if (code && code.toLowerCase().trim() !== existingSubject.code.toLowerCase()) {
      const existingByCode = subjects.find(s => 
        s.id !== subjectId && s.code.toLowerCase() === code.toLowerCase().trim()
      );
      if (existingByCode) {
        return res.status(409).json({
          error: 'Subject with this code already exists',
          code: 'SUBJECT_CODE_EXISTS'
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (description !== undefined) updateData.description = description.trim();
    
    const updatedSubject = updateSubject(subjectId, updateData);
    
    console.log(`📚 Subject updated: ${updatedSubject.name} by ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject
    });

  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({
      error: 'Failed to update subject',
      code: 'SUBJECT_UPDATE_ERROR'
    });
  }
});

// DELETE /api/subjects/:id - Delete subject (Principal only)
router.delete('/:id', requirePrincipal, (req, res) => {
  try {
    const subjectId = parseInt(req.params.id);
    
    if (isNaN(subjectId)) {
      return res.status(400).json({
        error: 'Invalid subject ID',
        code: 'INVALID_ID'
      });
    }
    
    const subject = findSubjectById(subjectId);
    if (!subject) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }
    
    // Check if subject is being used in schedules or attendance
    const { getAllSchedules, getAttendanceRecords } = require('../utils/database');
    const schedules = getAllSchedules({ subjectId });
    const attendanceRecords = getAttendanceRecords({ subjectId });
    
    if (schedules.length > 0 || attendanceRecords.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete subject that is being used in schedules or attendance records',
        code: 'SUBJECT_IN_USE',
        details: {
          schedules: schedules.length,
          attendanceRecords: attendanceRecords.length
        }
      });
    }
    
    const success = deleteSubject(subjectId);
    
    if (success) {
      console.log(`🗑️ Subject deleted: ${subject.name} by ${req.user.name}`);
      res.json({
        success: true,
        message: 'Subject deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete subject',
        code: 'SUBJECT_DELETE_ERROR'
      });
    }

  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({
      error: 'Failed to delete subject',
      code: 'SUBJECT_DELETE_ERROR'
    });
  }
});

module.exports = router;