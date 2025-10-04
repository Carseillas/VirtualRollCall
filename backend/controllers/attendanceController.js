// backend/controllers/attendanceController.js - Attendance Controller
const {
  addAttendanceRecord,
  getAttendanceRecords,
  getAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getTeacherSchedule,
  findClassById,
  findSubjectById,
  findUserById,
  getAttendanceStatistics,
  getStudentAttendanceHistory,
  getAllSchedules
} = require('../utils/database');

const socketService = require('../services/socketService');

/**
 * Submit new attendance record
 */
const submitAttendance = async (req, res) => {
  try {
    const { classId, subjectId, date, absentStudents = [], notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!classId || !subjectId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Class ID, Subject ID, and date are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    // Check for future dates
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      return res.status(400).json({
        success: false,
        error: 'Cannot take attendance for future dates',
        code: 'FUTURE_DATE'
      });
    }

    // Verify class exists
    const classData = findClassById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Verify subject exists
    const subjectData = findSubjectById(subjectId);
    if (!subjectData) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      });
    }

    // Check teacher permissions
    if (userRole === 'teacher') {
      const teacherSchedule = getTeacherSchedule(userId);
      const hasPermission = teacherSchedule.some(schedule => 
        schedule.classId === classId && schedule.subjectId === subjectId
      ) || classData.classTeacher === userId;

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
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
        success: false,
        error: 'Invalid student IDs found',
        code: 'INVALID_STUDENT_IDS',
        invalidIds: invalidStudentIds
      });
    }

    // Create attendance record
    const attendanceData = {
      teacherId: userId,
      classId: parseInt(classId),
      subjectId: parseInt(subjectId),
      date,
      absentStudents: absentStudents.map(id => parseInt(id)),
      notes: notes?.trim() || '',
      submittedBy: userId
    };

    const attendanceRecord = addAttendanceRecord(attendanceData);

    // Format response
    const formattedRecord = formatAttendanceRecord(attendanceRecord);

    // Emit real-time update via Socket.IO
    try {
      socketService.emitToClass(classId, 'attendanceUpdated', {
        record: formattedRecord,
        action: 'created'
      });
      
      socketService.emitToPrincipals('attendanceUpdated', {
        record: formattedRecord,
        action: 'created'
      });
    } catch (socketError) {
      console.warn('Socket.IO emit failed:', socketError);
    }

    console.log(`📋 Attendance submitted: ${classData.name} - ${subjectData.name} (${date}) by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: 'Attendance submitted successfully',
      data: formattedRecord
    });

  } catch (error) {
    console.error('Submit attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit attendance',
      code: 'SUBMISSION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get attendance records with filters
 */
const getAttendance = async (req, res) => {
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
      studentId,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

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
    if (userRole === 'teacher') {
      filters.teacherId = userId;
    }

    // Get records
    let records = getAttendanceRecords(filters);

    // Sort records
    records.sort((a, b) => {
      let compareA, compareB;
      
      switch (sortBy) {
        case 'date':
          compareA = new Date(a.date);
          compareB = new Date(b.date);
          break;
        case 'class':
          compareA = findClassById(a.classId)?.name || '';
          compareB = findClassById(b.classId)?.name || '';
          break;
        case 'subject':
          compareA = findSubjectById(a.subjectId)?.name || '';
          compareB = findSubjectById(b.subjectId)?.name || '';
          break;
        default:
          compareA = new Date(a.date);
          compareB = new Date(b.date);
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

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
        pages: Math.ceil(records.length / limitNum),
        hasNext: endIndex < records.length,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve attendance records',
      code: 'FETCH_ERROR'
    });
  }
};

/**
 * Get attendance for specific class and date
 */
const getClassAttendance = async (req, res) => {
  try {
    const { classId, date } = req.params;
    const { subjectId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate class ID
    const classIdNum = parseInt(classId);
    if (isNaN(classIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID',
        code: 'INVALID_CLASS_ID'
      });
    }

    // Validate date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    // Verify class exists
    const classData = findClassById(classIdNum);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Check teacher access
    if (userRole === 'teacher') {
      const teacherSchedule = getTeacherSchedule(userId);
      const hasAccess = teacherSchedule.some(schedule => 
        schedule.classId === classIdNum
      ) || classData.classTeacher === userId;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }
    }

    // Get attendance records
    const filters = { classId: classIdNum, date };
    if (subjectId) filters.subjectId = parseInt(subjectId);

    const records = getAttendanceRecords(filters);
    const formattedRecords = records.map(formatAttendanceRecord);

    res.json({
      success: true,
      data: formattedRecords,
      meta: {
        classId: classIdNum,
        className: classData.name,
        date,
        totalRecords: formattedRecords.length
      }
    });

  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve class attendance',
      code: 'FETCH_ERROR'
    });
  }
};

/**
 * Update attendance record
 */
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { absentStudents, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const recordId = parseInt(id);
    if (isNaN(recordId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid record ID',
        code: 'INVALID_ID'
      });
    }

    // Find existing record
    const existingRecord = getAttendanceRecords().find(r => r.id === recordId);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }

    // Check permissions
    if (userRole === 'teacher' && existingRecord.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own attendance records',
        code: 'ACCESS_DENIED'
      });
    }

    // Validate update data
    const updateData = {};

    if (absentStudents !== undefined) {
      if (!Array.isArray(absentStudents)) {
        return res.status(400).json({
          success: false,
          error: 'Absent students must be an array',
          code: 'INVALID_DATA_TYPE'
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
          success: false,
          error: 'Invalid student IDs found',
          code: 'INVALID_STUDENT_IDS',
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
    try {
      socketService.emitToClass(updatedRecord.classId, 'attendanceUpdated', {
        record: formattedRecord,
        action: 'updated'
      });
      
      socketService.emitToPrincipals('attendanceUpdated', {
        record: formattedRecord,
        action: 'updated'
      });
    } catch (socketError) {
      console.warn('Socket.IO emit failed:', socketError);
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
      success: false,
      error: 'Failed to update attendance record',
      code: 'UPDATE_ERROR'
    });
  }
};

/**
 * Delete attendance record
 */
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const recordId = parseInt(id);
    if (isNaN(recordId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid record ID',
        code: 'INVALID_ID'
      });
    }

    // Find existing record
    const existingRecord = getAttendanceRecords().find(r => r.id === recordId);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }

    // Check permissions
    if (userRole === 'teacher' && existingRecord.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own attendance records',
        code: 'ACCESS_DENIED'
      });
    }

    // Delete record
    const success = deleteAttendanceRecord(recordId);

    if (success) {
      // Emit real-time update
      try {
        socketService.emitToClass(existingRecord.classId, 'attendanceDeleted', {
          recordId,
          classId: existingRecord.classId,
          subjectId: existingRecord.subjectId,
          date: existingRecord.date
        });
        
        socketService.emitToPrincipals('attendanceDeleted', {
          recordId,
          classId: existingRecord.classId,
          date: existingRecord.date
        });
      } catch (socketError) {
        console.warn('Socket.IO emit failed:', socketError);
      }

      console.log(`🗑️ Attendance deleted: Record ${recordId} by ${req.user.name}`);

      res.json({
        success: true,
        message: 'Attendance record deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete attendance record',
        code: 'DELETE_ERROR'
      });
    }

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attendance record',
      code: 'DELETE_ERROR'
    });
  }
};

/**
 * Get teacher schedule with attendance status
 */
const getSchedule = async (req, res) => {
  try {
    const { teacherId, date } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Determine which teacher's schedule to fetch
    let targetTeacherId = userId;
    if (userRole === 'principal' && teacherId) {
      targetTeacherId = parseInt(teacherId);
    }

    const schedule = getTeacherSchedule(targetTeacherId);

    // Add attendance status
    const targetDate = date || new Date().toISOString().split('T')[0];
    const enrichedSchedule = schedule.map(item => {
      const attendanceRecord = getAttendanceRecord(
        item.classId,
        item.subjectId,
        targetDate
      );

      return {
        ...item,
        attendanceTaken: !!attendanceRecord,
        attendanceRecord: attendanceRecord ? formatAttendanceRecord(attendanceRecord) : null
      };
    });

    res.json({
      success: true,
      data: enrichedSchedule,
      meta: {
        teacherId: targetTeacherId,
        date: targetDate,
        totalClasses: enrichedSchedule.length,
        attendanceTaken: enrichedSchedule.filter(s => s.attendanceTaken).length,
        attendancePending: enrichedSchedule.filter(s => !s.attendanceTaken).length
      }
    });

  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve schedule',
      code: 'SCHEDULE_FETCH_ERROR'
    });
  }
};

/**
 * Get attendance statistics
 */
const getStatistics = async (req, res) => {
  try {
    const { 
      classId, 
      subjectId, 
      teacherId, 
      startDate, 
      endDate 
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Build filters
    const filters = {};
    if (classId) filters.classId = parseInt(classId);
    if (subjectId) filters.subjectId = parseInt(subjectId);
    if (teacherId) filters.teacherId = parseInt(teacherId);
    if (startDate && endDate) {
      filters.dateRange = { start: startDate, end: endDate };
    }

    // For teachers, only show their own statistics
    if (userRole === 'teacher') {
      filters.teacherId = userId;
    }

    const statistics = getAttendanceStatistics(filters);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      code: 'STATISTICS_ERROR'
    });
  }
};

/**
 * Get student attendance history
 */
const getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, classId, subjectId } = req.query;

    const studentIdNum = parseInt(studentId);
    if (isNaN(studentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID',
        code: 'INVALID_STUDENT_ID'
      });
    }

    // Build filters
    const filters = {};
    if (classId) filters.classId = parseInt(classId);
    if (subjectId) filters.subjectId = parseInt(subjectId);
    if (startDate && endDate) {
      filters.dateRange = { start: startDate, end: endDate };
    }

    const history = getStudentAttendanceHistory(studentIdNum, filters);

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
    console.error('Get student history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve student attendance history',
      code: 'HISTORY_ERROR'
    });
  }
};

/**
 * Bulk attendance submission (for multiple subjects/classes)
 */
const bulkSubmitAttendance = async (req, res) => {
  try {
    const { attendanceRecords } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Attendance records array is required',
        code: 'MISSING_DATA'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const record of attendanceRecords) {
      try {
        const attendanceData = {
          teacherId: userId,
          classId: parseInt(record.classId),
          subjectId: parseInt(record.subjectId),
          date: record.date,
          absentStudents: (record.absentStudents || []).map(id => parseInt(id)),
          notes: record.notes?.trim() || '',
          submittedBy: userId
        };

        const savedRecord = addAttendanceRecord(attendanceData);
        results.successful.push(formatAttendanceRecord(savedRecord));
      } catch (error) {
        results.failed.push({
          record,
          error: error.message
        });
      }
    }

    console.log(`📋 Bulk attendance: ${results.successful.length} successful, ${results.failed.length} failed by ${req.user.name}`);

    res.status(results.failed.length > 0 ? 207 : 201).json({
      success: results.failed.length === 0,
      message: `Processed ${attendanceRecords.length} records`,
      data: results
    });

  } catch (error) {
    console.error('Bulk submit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk attendance',
      code: 'BULK_SUBMIT_ERROR'
    });
  }
};

/**
 * Helper function to format attendance record
 */
const formatAttendanceRecord = (record) => {
  const classInfo = findClassById(record.classId);
  const subjectInfo = findSubjectById(record.subjectId);
  const teacherInfo = findUserById(record.teacherId);

  return {
    id: record.id,
    teacherId: record.teacherId,
    teacherName: teacherInfo?.name,
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

module.exports = {
  submitAttendance,
  getAttendance,
  getClassAttendance,
  updateAttendance,
  deleteAttendance,
  getSchedule,
  getStatistics,
  getStudentHistory,
  bulkSubmitAttendance
};