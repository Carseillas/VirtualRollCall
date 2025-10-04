// backend/controllers/reportController.js - Report Generation Controller
const path = require('path');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const {
  getAttendanceRecords,
  findClassById,
  findSubjectById,
  findUserById,
  getAttendanceStatistics,
  getAllSubjects
} = require('../utils/database');

/**
 * Generate attendance report
 */
const generateReport = async (req, res) => {
  let browser;
  
  try {
    const { classId, startDate, endDate, subjectId, format = 'pdf' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validation
    const errors = [];
    if (!classId || !Number.isInteger(classId)) {
      errors.push('Valid class ID is required');
    }
    if (!startDate || !isValidDate(startDate)) {
      errors.push('Valid start date is required (YYYY-MM-DD)');
    }
    if (!endDate || !isValidDate(endDate)) {
      errors.push('Valid end date is required (YYYY-MM-DD)');
    }
    if (startDate && endDate && startDate > endDate) {
      errors.push('Start date must be before end date');
    }
    if (!['pdf', 'html'].includes(format)) {
      errors.push('Format must be pdf or html');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // Verify class exists
    const classInfo = findClassById(classId);
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Check permissions for teachers
    if (userRole === 'teacher') {
      const { getTeacherSchedule } = require('../utils/database');
      const teacherSchedule = getTeacherSchedule(userId);
      const hasAccess = teacherSchedule.some(schedule =>
        schedule.classId === classId
      ) || classInfo.classTeacher === userId;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }
    }

    // Get attendance records
    const filters = {
      classId,
      dateRange: { start: startDate, end: endDate }
    };
    if (subjectId) filters.subjectId = parseInt(subjectId);

    const attendanceRecords = getAttendanceRecords(filters);
    
    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No attendance records found for the specified criteria',
        code: 'NO_RECORDS_FOUND'
      });
    }

    const statistics = getAttendanceStatistics(filters);
    const subjects = subjectId ? [findSubjectById(subjectId)] : getAllSubjects();
    const generatedBy = findUserById(userId);

    // Prepare report data
    const reportData = {
      classInfo,
      attendanceRecords,
      startDate,
      endDate,
      statistics,
      subjects: subjects.filter(s => s.isActive),
      generatedBy
    };

    const html = generateAttendanceHTML(reportData);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    }

    // Generate PDF
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '15px',
          bottom: '20px',
          left: '15px'
        }
      });

      await browser.close();

      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, '../reports');
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }

      // Save PDF file
      const filename = `attendance_${classInfo.name}_${startDate}_${endDate}_${Date.now()}.pdf`;
      const filepath = path.join(reportsDir, filename);
      await fs.writeFile(filepath, pdfBuffer);

      console.log(`📊 Report generated: ${filename} by ${req.user.name}`);

      res.json({
        success: true,
        message: 'Report generated successfully',
        data: {
          filename,
          downloadUrl: `/api/reports/download/${filename}`,
          fileSize: pdfBuffer.length,
          fileSizeFormatted: formatBytes(pdfBuffer.length),
          recordCount: attendanceRecords.length,
          dateRange: { startDate, endDate },
          className: classInfo.name,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (pdfError) {
      if (browser) await browser.close();
      throw pdfError;
    }

  } catch (error) {
    if (browser) await browser.close();
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      code: 'REPORT_GENERATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Download report file
 */
const downloadReport = async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (!filename.match(/^attendance_.*\.pdf$/) || filename.includes('..')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
        code: 'INVALID_FILENAME'
      });
    }

    const filepath = path.join(__dirname, '../reports', filename);

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Report file not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send file
    res.sendFile(filepath);

    console.log(`📥 Report downloaded: ${filename} by ${req.user.name}`);

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download report',
      code: 'DOWNLOAD_ERROR'
    });
  }
};

/**
 * List available reports
 */
const listReports = async (req, res) => {
  try {
    const reportsDir = path.join(__dirname, '../reports');

    try {
      const files = await fs.readdir(reportsDir);
      const reportFiles = [];

      for (const file of files) {
        if (file.endsWith('.pdf') && file.startsWith('attendance_')) {
          const filepath = path.join(reportsDir, file);
          const stats = await fs.stat(filepath);

          reportFiles.push({
            filename: file,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
            downloadUrl: `/api/reports/download/${file}`
          });
        }
      }

      // Sort by creation date (newest first)
      reportFiles.sort((a, b) => new Date(b.created) - new Date(a.created));

      res.json({
        success: true,
        data: reportFiles,
        meta: {
          total: reportFiles.length
        }
      });

    } catch (dirError) {
      // Directory doesn't exist or is empty
      res.json({
        success: true,
        data: [],
        meta: {
          total: 0
        }
      });
    }

  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list reports',
      code: 'LIST_REPORTS_ERROR'
    });
  }
};

/**
 * Delete report file (Principal only)
 */
const deleteReport = async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename
    if (!filename.match(/^attendance_.*\.pdf$/) || filename.includes('..')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
        code: 'INVALID_FILENAME'
      });
    }

    const filepath = path.join(__dirname, '../reports', filename);

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Report file not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Delete file
    await fs.unlink(filepath);

    console.log(`🗑️ Report deleted: ${filename} by ${req.user.name}`);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      code: 'DELETE_REPORT_ERROR'
    });
  }
};

/**
 * Preview report without generating file
 */
const previewReport = async (req, res) => {
  try {
    const { classId, startDate, endDate, subjectId } = req.body;

    // Validation
    const errors = [];
    if (!classId || !Number.isInteger(classId)) {
      errors.push('Valid class ID is required');
    }
    if (!startDate || !isValidDate(startDate)) {
      errors.push('Valid start date is required');
    }
    if (!endDate || !isValidDate(endDate)) {
      errors.push('Valid end date is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // Get preview data
    const classInfo = findClassById(classId);
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    const filters = {
      classId,
      dateRange: { start: startDate, end: endDate }
    };
    if (subjectId) filters.subjectId = parseInt(subjectId);

    const attendanceRecords = getAttendanceRecords(filters);
    const statistics = getAttendanceStatistics(filters);

    // Return preview data
    res.json({
      success: true,
      data: {
        className: classInfo.name,
        studentCount: classInfo.students.filter(s => s.isActive).length,
        dateRange: { startDate, endDate },
        recordCount: attendanceRecords.length,
        statistics: {
          totalRecords: statistics.totalRecords,
          attendanceRate: statistics.attendanceRate,
          totalPresent: statistics.totalPresent,
          totalAbsent: statistics.totalAbsent
        },
        estimatedFileSize: Math.round(attendanceRecords.length * 50) + ' KB'
      }
    });

  } catch (error) {
    console.error('Preview report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      code: 'PREVIEW_ERROR'
    });
  }
};

/**
 * Get reporting statistics (Principal only)
 */
const getReportStatistics = async (req, res) => {
  try {
    const reportsDir = path.join(__dirname, '../reports');

    const stats = {
      totalReports: 0,
      totalSize: 0,
      totalSizeFormatted: '0 Bytes',
      oldestReport: null,
      newestReport: null,
      reportsByMonth: {},
      averageSize: 0
    };

    try {
      const files = await fs.readdir(reportsDir);

      for (const file of files) {
        if (file.endsWith('.pdf') && file.startsWith('attendance_')) {
          const filepath = path.join(reportsDir, file);
          const fileStat = await fs.stat(filepath);

          stats.totalReports++;
          stats.totalSize += fileStat.size;

          if (!stats.oldestReport || fileStat.birthtime < new Date(stats.oldestReport)) {
            stats.oldestReport = fileStat.birthtime;
          }

          if (!stats.newestReport || fileStat.birthtime > new Date(stats.newestReport)) {
            stats.newestReport = fileStat.birthtime;
          }

          const monthKey = fileStat.birthtime.toISOString().substring(0, 7);
          stats.reportsByMonth[monthKey] = (stats.reportsByMonth[monthKey] || 0) + 1;
        }
      }

      if (stats.totalReports > 0) {
        stats.averageSize = Math.round(stats.totalSize / stats.totalReports);
      }

    } catch (dirError) {
      // Directory doesn't exist - return empty stats
    }

    stats.totalSizeFormatted = formatBytes(stats.totalSize);
    stats.averageSizeFormatted = formatBytes(stats.averageSize);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get report statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      code: 'STATISTICS_ERROR'
    });
  }
};

/**
 * Get available report templates
 */
const getTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'class-attendance',
        name: 'Class Attendance Report',
        description: 'Detailed attendance report for a specific class over a date range',
        icon: '📊',
        parameters: [
          { name: 'classId', type: 'number', required: true, description: 'Class ID' },
          { name: 'startDate', type: 'date', required: true, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'date', required: true, description: 'End date (YYYY-MM-DD)' },
          { name: 'subjectId', type: 'number', required: false, description: 'Subject ID (optional)' },
          { name: 'format', type: 'string', required: false, description: 'Output format (pdf/html)', default: 'pdf' }
        ],
        features: [
          'Student-wise attendance tracking',
          'Subject-wise breakdown',
          'Daily attendance records',
          'Attendance rate calculations',
          'Summary statistics'
        ]
      },
      {
        id: 'monthly-summary',
        name: 'Monthly Summary Report',
        description: 'Monthly attendance summary for all classes',
        icon: '📅',
        parameters: [
          { name: 'month', type: 'string', required: true, description: 'Month (YYYY-MM)' },
          { name: 'classId', type: 'number', required: false, description: 'Class ID (optional)' }
        ],
        features: [
          'Class-wise attendance summary',
          'Monthly trends',
          'Comparative analysis',
          'Attendance rate by class'
        ],
        status: 'coming-soon'
      },
      {
        id: 'student-history',
        name: 'Student Attendance History',
        description: 'Individual student attendance history report',
        icon: '👤',
        parameters: [
          { name: 'studentId', type: 'number', required: true, description: 'Student ID' },
          { name: 'startDate', type: 'date', required: true, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'date', required: true, description: 'End date (YYYY-MM-DD)' }
        ],
        features: [
          'Complete attendance history',
          'Subject-wise breakdown',
          'Attendance trends',
          'Performance indicators'
        ],
        status: 'coming-soon'
      },
      {
        id: 'teacher-performance',
        name: 'Teacher Performance Report',
        description: 'Teacher attendance submission and performance metrics',
        icon: '👩‍🏫',
        parameters: [
          { name: 'teacherId', type: 'number', required: true, description: 'Teacher ID' },
          { name: 'startDate', type: 'date', required: true, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'date', required: true, description: 'End date (YYYY-MM-DD)' }
        ],
        features: [
          'Attendance submission rate',
          'Class coverage',
          'Timeliness metrics',
          'Performance summary'
        ],
        status: 'coming-soon'
      }
    ];

    res.json({
      success: true,
      data: templates.filter(t => !t.status || t.status !== 'coming-soon' || req.user.role === 'principal')
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve templates',
      code: 'TEMPLATES_ERROR'
    });
  }
};

// Helper Functions

/**
 * Validate date format
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format bytes to human-readable size
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Generate HTML for attendance report
 */
const generateAttendanceHTML = (reportData) => {
  const {
    classInfo,
    attendanceRecords,
    startDate,
    endDate,
    statistics,
    subjects,
    generatedBy
  } = reportData;

  // Create date columns
  const uniqueDates = [...new Set(attendanceRecords.map(r => r.date))].sort();

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Attendance Report - ${classInfo.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Arial', sans-serif; 
                margin: 20px; 
                color: #333;
                font-size: 11px;
            }
            .header { 
                text-align: center; 
                margin-bottom: 30px;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
            }
            .school-info {
                font-size: 22px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
            }
            .report-title {
                font-size: 20px;
                color: #1e40af;
                margin: 10px 0;
                font-weight: bold;
            }
            .report-subtitle {
                font-size: 13px;
                color: #6b7280;
            }
            .class-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 25px;
                border-left: 5px solid #2563eb;
            }
            .info-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }
            .info-item {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            .info-label {
                font-weight: bold;
                color: #374151;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .info-value {
                color: #1f2937;
                font-size: 13px;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 25px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            th, td { 
                border: 1px solid #e5e7eb; 
                padding: 6px 4px; 
                text-align: center;
                font-size: 10px;
            }
            th { 
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: white;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            .student-info {
                text-align: left !important;
                font-weight: 500;
                padding: 6px 8px !important;
            }
            .student-name {
                font-weight: 600;
                color: #1f2937;
            }
            .student-id {
                color: #6b7280;
                font-size: 9px;
                display: block;
                margin-top: 2px;
            }
            tr:nth-child(even) { 
                background-color: #f9fafb; 
            }
            .absent { 
                background-color: #fef2f2 !important; 
                color: #dc2626;
                font-weight: bold;
            }
            .present { 
                background-color: #f0fdf4 !important; 
                color: #16a34a;
                font-weight: bold;
            }
            .summary {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                padding: 20px;
                border-radius: 8px;
                margin-top: 25px;
                border: 1px solid #bfdbfe;
            }
            .summary-title {
                font-size: 16px;
                color: #1e40af;
                margin-bottom: 15px;
                font-weight: bold;
            }
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
            }
            .summary-item {
                text-align: center;
                background: white;
                padding: 15px 10px;
                border-radius: 6px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .summary-number {
                font-size: 20px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 5px;
            }
            .summary-label {
                font-size: 10px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .legend {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-bottom: 20px;
                padding: 12px;
                background: #f8fafc;
                border-radius: 6px;
            }
            .legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 11px;
            }
            .legend-color {
                width: 14px;
                height: 14px;
                border-radius: 3px;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 9px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 15px;
            }
            @media print {
                body { margin: 10px; }
                .page-break { page-break-before: always; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="school-info">VirtualRollCall System</div>
            <div class="report-title">Attendance Report</div>
            <div class="report-subtitle">Class: ${classInfo.name} | Period: ${formatDate(startDate)} to ${formatDate(endDate)}</div>
        </div>
        
        <div class="class-info">
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Class Name</div>
                    <div class="info-value">${classInfo.name} - Grade ${classInfo.grade}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total Students</div>
                    <div class="info-value">${classInfo.students.filter(s => s.isActive).length}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Academic Year</div>
                    <div class="info-value">${classInfo.academicYear}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Report Period</div>
                    <div class="info-value">${formatDate(startDate)} - ${formatDate(endDate)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Generated On</div>
                    <div class="info-value">${new Date().toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Generated By</div>
                    <div class="info-value">${generatedBy.name}</div>
                </div>
            </div>
        </div>

        <div class="legend">
            <div class="legend-item">
                <div class="legend-color present"></div>
                <span>Present (P)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color absent"></div>
                <span>Absent (A)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #f3f4f6; border: 1px solid #d1d5db;"></div>
                <span>No Data (-)</span>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th rowspan="2">Student</th>
                    ${uniqueDates.map(date => `<th colspan="${subjects.length}">${formatDate(date)}</th>`).join('')}
                    <th rowspan="2">Total<br>Absences</th>
                    <th rowspan="2">Attendance<br>Rate</th>
                </tr>
                <tr>
                    ${uniqueDates.map(() =>
                        subjects.map(subject => `<th>${subject.code}</th>`).join('')
                    ).join('')}
                </tr>
            </thead>
            <tbody>
                ${classInfo.students.filter(s => s.isActive).map(student => {
                  let totalAbsences = 0;
                  let totalClasses = 0;

                  const attendanceCells = uniqueDates.map(date => {
                    return subjects.map(subject => {
                      const record = attendanceRecords.find(r =>
                        r.date === date && r.subjectId === subject.id
                      );

                      if (!record) {
                        return '<td>-</td>';
                      }

                      totalClasses++;
                      const isAbsent = record.absentStudents.includes(student.id);
                      if (isAbsent) totalAbsences++;

                      return `<td class="${isAbsent ? 'absent' : 'present'}">${isAbsent ? 'A' : 'P'}</td>`;
                    }).join('');
                  }).join('');

                  const attendanceRate = totalClasses > 0 ? Math.round(((totalClasses - totalAbsences) / totalClasses) * 100) : 0;

                  return `
                    <tr>
                        <td class="student-info">
                            <span class="student-name">${student.name}</span>
                            <span class="student-id">${student.studentId}</span>
                        </td>
                        ${attendanceCells}
                        <td><strong>${totalAbsences}</strong></td>
                        <td><strong>${attendanceRate}%</strong></td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>

        <div class="summary">
            <div class="summary-title">Report Summary</div>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-number">${statistics.totalRecords}</div>
                    <div class="summary-label">Total Records</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${statistics.attendanceRate}%</div>
                    <div class="summary-label">Overall Rate</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${statistics.totalPresent}</div>
                    <div class="summary-label">Total Present</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${statistics.totalAbsent}</div>
                    <div class="summary-label">Total Absent</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Generated by VirtualRollCall System on ${new Date().toLocaleString()}</p>
            <p>This report contains ${classInfo.students.filter(s => s.isActive).length} students across ${uniqueDates.length} days with ${attendanceRecords.length} attendance records</p>
            <p style="margin-top: 5px;">© ${new Date().getFullYear()} VirtualRollCall - All Rights Reserved</p>
        </div>
    </body>
    </html>
  `;
};

module.exports = {
  generateReport,
  downloadReport,
  listReports,
  deleteReport,
  previewReport,
  getReportStatistics,
  getTemplates
};