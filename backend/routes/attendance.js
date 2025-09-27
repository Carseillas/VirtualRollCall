// backend/routes/attendance.js - Attendance Management Routes
const express = require('express');
const {
  addAttendanceRecord,
  getAttendanceRecords,
  getAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getTeacherSchedule,
  findClassById,
  findSubjectById,
  getAttendanceStatistics,
  getStudentAttendanceHistory
} = require('../utils/database');
const {
  requireTeacherOrPrincipal,
  requirePrincipal
} = require('../middleware/auth');

const router = express.Router();

// Utility functions
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};

const formatAttendanceRecord = (record) => {
  const classInfo = findClassById(record.classId);
  const subjectInfo = findSubjectById(record.subjectId);
  
  return {
    id: record.id,
    teacherId: record.teacherId,
    classId: record.classId,
    className: classInfo?.name,
    subjectId: record.subjectId,
    subjectName: subjectInfo?.name,
    date: record.date,
    totalStudents: record.totalStudents,
    presentStudents: record.presentStudents || [],
    absentStudents: record.absentStudents || [],
    presentCount: record.presentStudents?.length || 0,
    absentCount: record.absentStudents?.length || 0,
    attendanceRate: record.totalStudents > 0 
      ? Math.round(((record.presentStudents?.length || 0) / record.totalStudents) * 100) 
      : 0,
    notes: record.notes,
    submittedAt: record.submittedAt,
    submittedBy: record.submittedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
};

// POST /api/attendance - Submit attendance record
router.post('/', requireTeacherOrPrincipal, (req, res) => {
  try {
    const { classId, subjectId, date, absentStudents = [], notes } = req.body;
    
    // Validation
    const errors = [];
    if (!classId || !Number.isInteger(classId)) {
      errors.push('Valid class ID is required');
    }
    if (!subjectId || !Number.isInteger(subjectId)) {
      errors.push('Valid subject ID is required');
    }
    if (!date || !isValidDate(date)) {
      errors.push('Valid date is required (YYYY-MM-DD format)');
    }
    if (!Array.isArray(absentStudents)) {
      errors.push('Absent students must be an array');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    // Verify class exists
    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }
    
    // Verify subject exists
    const subjectData = findSubjectById(subjectId);
    if (!subjectData) {
      return res.status(404).json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }
    
    // Check if teacher has permission to take attendance for this class/subject
    if (req.user.role === 'teacher') {
      // Check if teacher teaches this subject to this class
      const teacherSchedule = getTeacherSchedule(req.user.id);
      const hasPermission = teacherSchedule.some(schedule => 
        schedule.classId === classId && schedule.subjectId === subjectId
      ) || classData.classTeacher === req.user.id;
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'You do not have permission to take attendance for this class/subject',
          code: 'ACCESS_DENIED'
        });
      }
    }
    
    // Validate absent student IDs
    const activeStudents = classData.students.filter(s => s.isActive);
    const activeStudentIds = activeStudents.map(s => s.id);
    
    const invalidStudentIds = absentStudents.filter(id => 
      !activeStudentIds.includes(parseInt(id))
    );
    
    if (invalidStudentIds.length > 0) {
      return res.status(400).json({
        error: 'Invalid student IDs found',
        invalidIds: invalidStudentIds
      });
    }
    
    // Check for future dates
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      return res.status(400).json({
        error: 'Cannot take attendance for future dates',
        code: 'FUTURE_DATE'
      });
    }
    
    // Create attendance record
    const attendanceData = {
      teacherId: req.user.id,
      classId,
      subjectId,
      date,
      absentStudents: absentStudents.map(id => parseInt(id)),
      notes: notes?.trim() || '',
      submittedBy: req.user.id
    };
    
    const attendanceRecord = addAttendanceRecord(attendanceData);
    const formattedRecord = formatAttendanceRecord(attendanceRecord);
    
    // Emit real-time update via Socket.IO if available
    if (req.app.get('io')) {
      req.app.get('io').emit('attendanceUpdated', {
        classId,
        subjectId,
        date,
        record: formattedRecord
      });
    }
    
    console.log(`📋 Attendance recorded: ${classData.name} - ${subjectData.name} (${date}) by ${req.user.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: formattedRecord
    });

  } catch (error) {
    console.error('Submit attendance error:', error);
    res.status(500).json({
      error: 'Failed to submit attendance',
      code: 'ATTENDANCE_SUBMIT_ERROR'
    });
  }
});

// GET /api/attendance - Get attendance records with filters
router.get('/', requireTeacherOrPrincipal, (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      classId, 
      subjectId, 
      teacherId,
      date, 
      startDate, 
      endDate,
      studentId 
    } = req.query;
    
    // Build filters
    const filters = {};
    if (classId) filters.classId = parseInt(classId);
    if (subjectId) filters.subjectId = parseInt(subjectId);
    if (teacherId) filters.teacherId = parseInt(teacherId);
    if (date) filters.date = date;
    if (startDate && endDate) {
      filters.dateRange = { start: startDate, end: endDate };
    }
    if (studentId) filters.studentId = parseInt(studentId);
    
    // For teachers, only show their own records
    if (req.user.role === 'teacher') {
      filters.teacherId = req.user.id;
    }
    
    const records = getAttendanceRecords(filters);
    
    // Sort by date (newest first)
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedRecords = records.slice(startIndex, endIndex);
    const formattedRecords = paginatedRecords.map(formatAttendanceRecord);
    
    res.json({
      success: true,
      data: formattedRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: records.length,
        pages: Math.ceil(records.length / limitNum)
      }
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      error: 'Failed to retrieve attendance records',
      code: 'ATTENDANCE_FETCH_ERROR'
    });
  }
});

// GET /api/attendance/:classId/:date - Get attendance for specific class and date
router.get('/:classId/:date', requireTeacherOrPrincipal, (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const { date } = req.params;
    const { subjectId } = req.query;
    
    if (isNaN(classId)) {
      return res.status(400).json({
        error: 'Invalid class ID',
        code: 'INVALID_ID'
      });
    }
    
    if (!isValidDate(date)) {
      return res.status(400).json({
        error: 'Invalid date format (YYYY-MM-DD required)',
        code: 'INVALID_DATE'
      });
    }
    
    // Verify class exists
    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }
    
    // Check teacher access
    if (req.user.role === 'teacher') {
      const teacherSchedule = getTeacherSchedule(req.user.id);
      const hasAccess = teacherSchedule.some(schedule => 
        schedule.classId === classId
      ) || classData.classTeacher === req.user.id;
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }
    }
    
    // Get attendance records for the class and date
    const filters = { classId, date };
    if (subjectId) filters.subjectId = parseInt(subjectId);
    
    const records = getAttendanceRecords(filters);
    const formattedRecords = records.map(formatAttendanceRecord);
    
    res.json({
      success: true,
      data: formattedRecords,
      meta: {
        classId,
        className: classData.name,
        date,
        totalRecords: formattedRecords.length
      }
    });

  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({
      error: 'Failed to retrieve attendance',
      code: 'ATTENDANCE_FETCH_ERROR'
    });
  }
});

// PUT /api/attendance/:id - Update attendance record
router.put('/:id', requireTeacherOrPrincipal, (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const { absentStudents, notes } = req.body;
    
    if (isNaN(recordId)) {
      return res.status(400).json({
        error: 'Invalid record ID',
        code: 'INVALID_ID'
      });
    }
    
    // Find existing record
    const existingRecord = getAttendanceRecords().find(r => r.id === recordId);
    if (!existingRecord) {
      return res.status(404).json({
        error: 'Attendance record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }
    
    // Check permissions
    if (req.user.role === 'teacher' && existingRecord.teacherId !== req.user.id) {
      return res.status(403).json({
        error: 'You can only update your own attendance records',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Validate update data
    const updateData = {};
    
    if (absentStudents !== undefined) {
      if (!Array.isArray(absentStudents)) {
        return res.status(400).json({
          error: 'Absent students must be an array',
          code: 'INVALID_DATA'
        });
      }
      
      // Validate student IDs
      const classData = findClassById(existingRecord.classId);
      const activeStudentIds = classData.students
        .filter(s => s.isActive)
        .map(s => s.id);
      
      const invalidIds = absentStudents.filter(id => 
        !activeStudentIds.includes(parseInt(id))
      );
      
      if (invalidIds.length > 0) {
        return res.status(400).json({
          error: 'Invalid student IDs found',
          invalidIds
        });
      }
      
      updateData.absentStudents = absentStudents.map(id => parseInt(id));
    }
    
    if (notes !== undefined) {
      updateData.notes = notes.trim();
    }
    
    // Update record
    const updatedRecord = updateAttendanceRecord(recordId, updateData);
    const formattedRecord = formatAttendanceRecord(updatedRecord);
    
    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('attendanceUpdated', {
        classId: updatedRecord.classId,
        subjectId: updatedRecord.subjectId,
        date: updatedRecord.date,
        record: formattedRecord
      });
    }
    
    console.log(`📋 Attendance updated: Record ${recordId} by ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: formattedRecord
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      error: 'Failed to update attendance record',
      code: 'ATTENDANCE_UPDATE_ERROR'
    });
  }
});

// DELETE /api/attendance/:id - Delete attendance record
router.delete('/:id', requireTeacherOrPrincipal, (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    
    if (isNaN(recordId)) {
      return res.status(400).json({
        error: 'Invalid record ID',
        code: 'INVALID_ID'
      });
    }
    
    // Find existing record
    const existingRecord = getAttendanceRecords().find(r => r.id === recordId);
    if (!existingRecord) {
      return res.status(404).json({
        error: 'Attendance record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }
    
    // Check permissions
    if (req.user.role === 'teacher' && existingRecord.teacherId !== req.user.id) {
      return res.status(403).json({
        error: 'You can only delete your own attendance records',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Delete record
    const success = deleteAttendanceRecord(recordId);
    
    if (success) {
      // Emit real-time update
      if (req.app.get('io')) {
        req.app.get('io').emit('attendanceDeleted', {
          recordId,
          classId: existingRecord.classId,
          subjectId: existingRecord.subjectId,
          date: existingRecord.date
        });
      }
      
      console.log(`🗑️ Attendance deleted: Record ${recordId} by ${req.user.name}`);
      
      res.json({
        success: true,
        message: 'Attendance record deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete attendance record',
        code: 'ATTENDANCE_DELETE_ERROR'
      });
    }

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      error: 'Failed to delete attendance record',
      code: 'ATTENDANCE_DELETE_ERROR'
    });
  }
});

// GET /api/attendance/teacher/schedule - Get teacher's schedule
router.get('/teacher/schedule', requireTeacherOrPrincipal, (req, res) => {
  try {
    const { teacherId } = req.query;
    
    // Determine which teacher's schedule to fetch
    let targetTeacherId = req.user.id;
    if (req.user.role === 'principal' && teacherId) {
      targetTeacherId = parseInt(teacherId);
    }
    
    const schedule = getTeacherSchedule(targetTeacherId);
    
    // Add attendance status for today
    const today = new Date().toISOString().split('T')[0];
    const enrichedSchedule = schedule.map(item => {
      const todayAttendance = getAttendanceRecord(
        item.classId, 
        item.subjectId, 
        today
      );
      
      return {
        ...item,
        attendanceTaken: !!todayAttendance,
        attendanceRecord: todayAttendance ? formatAttendanceRecord(todayAttendance) : null
      };
    });
    
    res.json({
      success: true,
      data: enrichedSchedule,
      meta: {
        teacherId: targetTeacherId,
        date: today,
        totalClasses: enrichedSchedule.length,
        attendanceTaken: enrichedSchedule.filter(s => s.attendanceTaken).length
      }
    });

  } catch (error) {
    console.error('Get teacher schedule error:', error);
    res.status(500).json({
      error: 'Failed to retrieve teacher schedule',
      code: 'SCHEDULE_FETCH_ERROR'
    });
  }
});

// GET /api/attendance/statistics - Get attendance statistics
router.get('/statistics', requireTeacherOrPrincipal, (req, res) => {
  try {
    const { 
      classId, 
      subjectId, 
      teacherId, 
      startDate, 
      endDate 
    } = req.query;
    
    // Build filters
    const filters = {};
    if (classId) filters.classId = parseInt(classId);
    if (subjectId) filters.subjectId = parseInt(subjectId);
    if (teacherId) filters.teacherId = parseInt(teacherId);
    if (startDate && endDate) {
      filters.dateRange = { start: startDate, end: endDate };
    }
    
    // For teachers, only show their own statistics
    if (req.user.role === 'teacher') {
      filters.teacherId = req.user.id;
    }
    
    const statistics = getAttendanceStatistics(filters);
    
    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Get attendance statistics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve attendance statistics',
      code: 'STATISTICS_ERROR'
    });
  }
});

// GET /api/attendance/student/:studentId/history - Get student attendance history
router.get('/student/:studentId/history', requireTeacherOrPrincipal, (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { startDate, endDate, classId, subjectId } = req.query;
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        error: 'Invalid student ID',
        code: 'INVALID_ID'
      });
    }
    
    // Build filters
    const filters = {};
    if (classId) filters.classId = parseInt(classId);
    if (subjectId) filters.subjectId = parseInt(subjectId);
    if (startDate && endDate) {
      filters.dateRange = { start: startDate, end: endDate };
    }
    
    const history = getStudentAttendanceHistory(studentId, filters);
    
    // Calculate summary statistics
    const summary = {
      totalClasses: history.length,
      present: history.filter(h => h.status === 'present').length,
      absent: history.filter(h => h.status === 'absent').length,
      attendanceRate: 0
    };
    
    if (summary.totalClasses > 0) {
      summary.attendanceRate = Math.round((summary.present / summary.totalClasses) * 100);
    }
    
    res.json({
      success: true,
      data: history,
      summary
    });

  } catch (error) {
    console.error('Get student attendance history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve student attendance history',
      code: 'HISTORY_ERROR'
    });
  }
});

module.exports = router;