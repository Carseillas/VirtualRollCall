const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { auth, restrictTo } = require('../middleware/auth');
const { 
  validateDateRange,
  validateReportParams,
  validateExportFormat
} = require('../middleware/validation');

/**
 * @route   GET /api/reports/attendance/daily
 * @desc    Get daily attendance report for a specific date
 * @access  Private (Principal and Teachers)
 * @query   date, classId, subjectId
 */
router.get(
  '/attendance/daily',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getDailyAttendanceReport
);

/**
 * @route   GET /api/reports/attendance/weekly
 * @desc    Get weekly attendance report
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, classId, subjectId
 */
router.get(
  '/attendance/weekly',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getWeeklyAttendanceReport
);

/**
 * @route   GET /api/reports/attendance/monthly
 * @desc    Get monthly attendance report
 * @access  Private (Principal and Teachers)
 * @query   month, year, classId, subjectId
 */
router.get(
  '/attendance/monthly',
  auth,
  restrictTo('principal', 'teacher'),
  validateReportParams,
  reportController.getMonthlyAttendanceReport
);

/**
 * @route   GET /api/reports/attendance/custom
 * @desc    Get custom date range attendance report
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, classId, subjectId
 */
router.get(
  '/attendance/custom',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getCustomAttendanceReport
);

/**
 * @route   GET /api/reports/attendance/student/:studentId
 * @desc    Get attendance report for a specific student
 * @access  Private (Principal, Teachers, and Student themselves)
 * @query   startDate, endDate, subjectId
 */
router.get(
  '/attendance/student/:studentId',
  auth,
  validateDateRange,
  reportController.getStudentAttendanceReport
);

/**
 * @route   GET /api/reports/attendance/class/:classId
 * @desc    Get comprehensive attendance report for a class
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, subjectId
 */
router.get(
  '/attendance/class/:classId',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getClassAttendanceReport
);

/**
 * @route   GET /api/reports/attendance/subject/:subjectId
 * @desc    Get attendance report for a specific subject across all classes
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, classId
 */
router.get(
  '/attendance/subject/:subjectId',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getSubjectAttendanceReport
);

/**
 * @route   GET /api/reports/attendance/teacher/:teacherId
 * @desc    Get attendance report for a specific teacher's classes
 * @access  Private (Principal and Teacher themselves)
 * @query   startDate, endDate, classId, subjectId
 */
router.get(
  '/attendance/teacher/:teacherId',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getTeacherAttendanceReport
);

/**
 * @route   GET /api/reports/attendance/defaulters
 * @desc    Get list of students with low attendance (defaulters)
 * @access  Private (Principal and Teachers)
 * @query   threshold (default 75%), startDate, endDate, classId
 */
router.get(
  '/attendance/defaulters',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getAttendanceDefaulters
);

/**
 * @route   GET /api/reports/attendance/summary
 * @desc    Get attendance summary statistics
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, classId, subjectId
 */
router.get(
  '/attendance/summary',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getAttendanceSummary
);

/**
 * @route   POST /api/reports/export/pdf
 * @desc    Export attendance report as PDF
 * @access  Private (Principal and Teachers)
 * @body    reportType, filters, options
 */
router.post(
  '/export/pdf',
  auth,
  restrictTo('principal', 'teacher'),
  validateExportFormat,
  reportController.exportToPDF
);

/**
 * @route   POST /api/reports/export/excel
 * @desc    Export attendance report as Excel
 * @access  Private (Principal and Teachers)
 * @body    reportType, filters, options
 */
router.post(
  '/export/excel',
  auth,
  restrictTo('principal', 'teacher'),
  validateExportFormat,
  reportController.exportToExcel
);

/**
 * @route   POST /api/reports/export/csv
 * @desc    Export attendance report as CSV
 * @access  Private (Principal and Teachers)
 * @body    reportType, filters, options
 */
router.post(
  '/export/csv',
  auth,
  restrictTo('principal', 'teacher'),
  validateExportFormat,
  reportController.exportToCSV
);

/**
 * @route   GET /api/reports/analytics/overview
 * @desc    Get overall attendance analytics and trends
 * @access  Private (Principal only)
 * @query   startDate, endDate
 */
router.get(
  '/analytics/overview',
  auth,
  restrictTo('principal'),
  validateDateRange,
  reportController.getAttendanceAnalytics
);

/**
 * @route   GET /api/reports/analytics/trends
 * @desc    Get attendance trends over time
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, classId, subjectId, groupBy
 */
router.get(
  '/analytics/trends',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getAttendanceTrends
);

/**
 * @route   GET /api/reports/analytics/comparison
 * @desc    Compare attendance between classes, subjects, or time periods
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, compareBy, entityIds
 */
router.get(
  '/analytics/comparison',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getAttendanceComparison
);

/**
 * @route   GET /api/reports/analytics/heatmap
 * @desc    Get attendance heatmap data (day/time patterns)
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, classId, subjectId
 */
router.get(
  '/analytics/heatmap',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getAttendanceHeatmap
);

/**
 * @route   GET /api/reports/analytics/subject-wise
 * @desc    Get subject-wise attendance statistics
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, classId
 */
router.get(
  '/analytics/subject-wise',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getSubjectWiseAnalytics
);

/**
 * @route   GET /api/reports/analytics/class-wise
 * @desc    Get class-wise attendance statistics
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate, subjectId
 */
router.get(
  '/analytics/class-wise',
  auth,
  restrictTo('principal', 'teacher'),
  validateDateRange,
  reportController.getClassWiseAnalytics
);

/**
 * @route   POST /api/reports/scheduled
 * @desc    Schedule a recurring report (daily/weekly/monthly email)
 * @access  Private (Principal and Teachers)
 * @body    reportType, frequency, recipients, filters
 */
router.post(
  '/scheduled',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.scheduleReport
);

/**
 * @route   GET /api/reports/scheduled
 * @desc    Get all scheduled reports
 * @access  Private (Principal and Teachers)
 */
router.get(
  '/scheduled',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.getScheduledReports
);

/**
 * @route   PUT /api/reports/scheduled/:reportId
 * @desc    Update a scheduled report
 * @access  Private (Principal and Teachers)
 */
router.put(
  '/scheduled/:reportId',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.updateScheduledReport
);

/**
 * @route   DELETE /api/reports/scheduled/:reportId
 * @desc    Delete a scheduled report
 * @access  Private (Principal and Teachers)
 */
router.delete(
  '/scheduled/:reportId',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.deleteScheduledReport
);

/**
 * @route   GET /api/reports/history
 * @desc    Get report generation history
 * @access  Private (Principal and Teachers)
 * @query   limit, offset, reportType, startDate, endDate
 */
router.get(
  '/history',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.getReportHistory
);

/**
 * @route   GET /api/reports/download/:reportId
 * @desc    Download a previously generated report
 * @access  Private (Principal and Teachers)
 */
router.get(
  '/download/:reportId',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.downloadReport
);

/**
 * @route   DELETE /api/reports/history/:reportId
 * @desc    Delete a report from history
 * @access  Private (Principal and Teachers)
 */
router.delete(
  '/history/:reportId',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.deleteReportHistory
);

/**
 * @route   POST /api/reports/email
 * @desc    Email a report to specific recipients
 * @access  Private (Principal and Teachers)
 * @body    reportType, filters, recipients, message
 */
router.post(
  '/email',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.emailReport
);

/**
 * @route   GET /api/reports/templates
 * @desc    Get available report templates
 * @access  Private (Principal and Teachers)
 */
router.get(
  '/templates',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.getReportTemplates
);

/**
 * @route   POST /api/reports/templates
 * @desc    Create a custom report template
 * @access  Private (Principal only)
 * @body    name, description, template, filters
 */
router.post(
  '/templates',
  auth,
  restrictTo('principal'),
  reportController.createReportTemplate
);

/**
 * @route   PUT /api/reports/templates/:templateId
 * @desc    Update a report template
 * @access  Private (Principal only)
 */
router.put(
  '/templates/:templateId',
  auth,
  restrictTo('principal'),
  reportController.updateReportTemplate
);

/**
 * @route   DELETE /api/reports/templates/:templateId
 * @desc    Delete a report template
 * @access  Private (Principal only)
 */
router.delete(
  '/templates/:templateId',
  auth,
  restrictTo('principal'),
  reportController.deleteReportTemplate
);

/**
 * @route   POST /api/reports/parent-notification
 * @desc    Send attendance report to parents via email/SMS
 * @access  Private (Principal and Teachers)
 * @body    studentIds, startDate, endDate, notificationType
 */
router.post(
  '/parent-notification',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.sendParentNotification
);

/**
 * @route   GET /api/reports/statistics
 * @desc    Get comprehensive statistics for dashboard
 * @access  Private (Principal and Teachers)
 * @query   startDate, endDate
 */
router.get(
  '/statistics',
  auth,
  restrictTo('principal', 'teacher'),
  reportController.getStatistics
);

module.exports = router;