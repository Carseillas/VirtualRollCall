const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { format } = require('date-fns');

class PDFService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../reports');
    this.templatesDir = path.join(__dirname, '../templates');
    this.initializeDirectories();
    this.registerHandlebarsHelpers();
  }

  // Initialize required directories
  async initializeDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  // Register custom Handlebars helpers
  registerHandlebarsHelpers() {
    // Date formatting helper
    handlebars.registerHelper('formatDate', (date, formatStr = 'dd/MM/yyyy') => {
      if (!date) return 'N/A';
      return format(new Date(date), formatStr);
    });

    // Percentage helper
    handlebars.registerHelper('percentage', (value, total) => {
      if (!total || total === 0) return '0.00';
      return ((value / total) * 100).toFixed(2);
    });

    // Status badge color helper
    handlebars.registerHelper('statusColor', (status) => {
      const colors = {
        present: '#10b981',
        absent: '#ef4444',
        late: '#f59e0b',
        excused: '#6366f1'
      };
      return colors[status?.toLowerCase()] || '#6b7280';
    });

    // Number formatting helper
    handlebars.registerHelper('formatNumber', (number) => {
      return Number(number).toLocaleString();
    });

    // Conditional helper
    handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
      switch (operator) {
        case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        default: return options.inverse(this);
      }
    });

    // Array length helper
    handlebars.registerHelper('length', (array) => {
      return Array.isArray(array) ? array.length : 0;
    });

    // Math operations helper
    handlebars.registerHelper('math', function(lvalue, operator, rvalue) {
      lvalue = parseFloat(lvalue);
      rvalue = parseFloat(rvalue);
      switch (operator) {
        case '+': return lvalue + rvalue;
        case '-': return lvalue - rvalue;
        case '*': return lvalue * rvalue;
        case '/': return lvalue / rvalue;
        case '%': return lvalue % rvalue;
        default: return lvalue;
      }
    });
  }

  /**
   * Generate daily attendance report PDF
   */
  async generateDailyAttendanceReport(data) {
    try {
      const templatePath = path.join(this.templatesDir, 'dailyAttendanceReport.html');
      const template = await this.loadTemplate(templatePath);
      
      const html = template({
        ...data,
        generatedDate: format(new Date(), 'dd/MM/yyyy HH:mm'),
        reportTitle: 'Daily Attendance Report'
      });

      const filename = `daily_attendance_${data.date}_${data.class?.name || 'all'}_${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);

      await this.generatePDFFromHTML(html, filepath, {
        format: 'A4',
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      return { filepath, filename };
    } catch (error) {
      throw new Error(`Failed to generate daily attendance report: ${error.message}`);
    }
  }

  /**
   * Generate monthly attendance report PDF
   */
  async generateMonthlyAttendanceReport(data) {
    try {
      const templatePath = path.join(this.templatesDir, 'monthlyAttendanceReport.html');
      const template = await this.loadTemplate(templatePath);
      
      const html = template({
        ...data,
        generatedDate: format(new Date(), 'dd/MM/yyyy HH:mm'),
        reportTitle: 'Monthly Attendance Report'
      });

      const filename = `monthly_attendance_${data.month}_${data.year}_${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);

      await this.generatePDFFromHTML(html, filepath, {
        format: 'A4',
        landscape: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      return { filepath, filename };
    } catch (error) {
      throw new Error(`Failed to generate monthly attendance report: ${error.message}`);
    }
  }

  /**
   * Generate student attendance report PDF
   */
  async generateStudentAttendanceReport(data) {
    try {
      const templatePath = path.join(this.templatesDir, 'studentAttendanceReport.html');
      const template = await this.loadTemplate(templatePath);
      
      const html = template({
        ...data,
        generatedDate: format(new Date(), 'dd/MM/yyyy HH:mm'),
        reportTitle: 'Student Attendance Report'
      });

      const filename = `student_attendance_${data.student?.studentId}_${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);

      await this.generatePDFFromHTML(html, filepath, {
        format: 'A4',
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      return { filepath, filename };
    } catch (error) {
      throw new Error(`Failed to generate student attendance report: ${error.message}`);
    }
  }

  /**
   * Generate class attendance report PDF
   */
  async generateClassAttendanceReport(data) {
    try {
      const templatePath = path.join(this.templatesDir, 'classAttendanceReport.html');
      const template = await this.loadTemplate(templatePath);
      
      const html = template({
        ...data,
        generatedDate: format(new Date(), 'dd/MM/yyyy HH:mm'),
        reportTitle: 'Class Attendance Report'
      });

      const filename = `class_attendance_${data.class?.name}_${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);

      await this.generatePDFFromHTML(html, filepath, {
        format: 'A4',
        landscape: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      return { filepath, filename };
    } catch (error) {
      throw new Error(`Failed to generate class attendance report: ${error.message}`);
    }
  }

  /**
   * Generate defaulters list PDF
   */
  async generateDefaultersReport(data) {
    try {
      const templatePath = path.join(this.templatesDir, 'defaultersReport.html');
      const template = await this.loadTemplate(templatePath);
      
      const html = template({
        ...data,
        generatedDate: format(new Date(), 'dd/MM/yyyy HH:mm'),
        reportTitle: 'Attendance Defaulters Report'
      });

      const filename = `defaulters_report_${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);

      await this.generatePDFFromHTML(html, filepath, {
        format: 'A4',
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      return { filepath, filename };
    } catch (error) {
      throw new Error(`Failed to generate defaulters report: ${error.message}`);
    }
  }

  /**
   * Generate custom report from template
   */
  async generateCustomReport(templateName, data, options = {}) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      const template = await this.loadTemplate(templatePath);
      
      const html = template({
        ...data,
        generatedDate: format(new Date(), 'dd/MM/yyyy HH:mm')
      });

      const filename = `${templateName}_${Date.now()}.pdf`;
      const filepath = path.join(this.reportsDir, filename);

      await this.generatePDFFromHTML(html, filepath, {
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: options.margin || { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      return { filepath, filename };
    } catch (error) {
      throw new Error(`Failed to generate custom report: ${error.message}`);
    }
  }

  /**
   * Generate PDF from HTML using Puppeteer
   */
  async generatePDFFromHTML(html, filepath, options = {}) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: filepath,
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: options.margin || { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
        printBackground: true
      });

      return filepath;
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate Excel report
   */
  async generateExcelReport(data, reportType = 'attendance') {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');

      // Set worksheet properties
      worksheet.properties.defaultRowHeight = 20;

      // Add title
      worksheet.mergeCells('A1:F1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = data.reportTitle || 'Attendance Report';
      titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add metadata
      worksheet.getCell('A2').value = 'Generated Date:';
      worksheet.getCell('B2').value = format(new Date(), 'dd/MM/yyyy HH:mm');
      worksheet.getCell('A3').value = 'Period:';
      worksheet.getCell('B3').value = `${data.startDate} to ${data.endDate}`;

      // Add headers
      const headerRow = worksheet.getRow(5);
      const headers = this.getExcelHeaders(reportType);
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF70AD47' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Add data rows
      if (data.records && Array.isArray(data.records)) {
        data.records.forEach((record, index) => {
          const row = worksheet.getRow(6 + index);
          const rowData = this.formatExcelRowData(record, reportType);
          rowData.forEach((value, colIndex) => {
            const cell = row.getCell(colIndex + 1);
            cell.value = value;
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            
            // Add conditional formatting for attendance percentage
            if (headers[colIndex] === 'Attendance %') {
              const percentage = parseFloat(value);
              if (percentage < 75) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFFCCCC' }
                };
              } else if (percentage >= 90) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFCCFFCC' }
                };
              }
            }
          });
        });
      }

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // Add borders
      const lastRow = 5 + (data.records?.length || 0);
      const lastCol = headers.length;
      for (let row = 5; row <= lastRow; row++) {
        for (let col = 1; col <= lastCol; col++) {
          const cell = worksheet.getCell(row, col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }

      // Add summary
      if (data.summary) {
        const summaryRow = lastRow + 2;
        worksheet.getCell(`A${summaryRow}`).value = 'Summary:';
        worksheet.getCell(`A${summaryRow}`).font = { bold: true };
        
        Object.entries(data.summary).forEach(([key, value], index) => {
          worksheet.getCell(`A${summaryRow + index + 1}`).value = key;
          worksheet.getCell(`B${summaryRow + index + 1}`).value = value;
        });
      }

      const filename = `${reportType}_report_${Date.now()}.xlsx`;
      const filepath = path.join(this.reportsDir, filename);

      await workbook.xlsx.writeFile(filepath);

      return { filepath, filename };
    } catch (error) {
      throw new Error(`Failed to generate Excel report: ${error.message}`);
    }
  }

  /**
   * Generate CSV report
   */
  async generateCSVReport(data, reportType = 'attendance') {
    try {
      const headers = this.getExcelHeaders(reportType);
      let csv = headers.join(',') + '\n';

      if (data.records && Array.isArray(data.records)) {
        data.records.forEach(record => {
          const rowData = this.formatExcelRowData(record, reportType);
          csv += rowData.map(value => `"${value}"`).join(',') + '\n';
        });
      }

      const filename = `${reportType}_report_${Date.now()}.csv`;
      const filepath = path.join(this.reportsDir, filename);

      await fs.writeFile(filepath, csv, 'utf8');

      return { filepath, filename };
    } catch (error) {
      throw new Error(`Failed to generate CSV report: ${error.message}`);
    }
  }

  /**
   * Get Excel headers based on report type
   */
  getExcelHeaders(reportType) {
    const headers = {
      attendance: ['Student ID', 'Name', 'Class', 'Total Days', 'Present', 'Absent', 'Late', 'Attendance %'],
      daily: ['Student ID', 'Name', 'Roll No', 'Status', 'Time', 'Remarks'],
      monthly: ['Student ID', 'Name', 'Class', 'Present Days', 'Total Days', 'Percentage'],
      defaulters: ['Student ID', 'Name', 'Class', 'Attendance %', 'Total Absences', 'Parent Contact'],
      subject: ['Subject', 'Class', 'Teacher', 'Total Classes', 'Avg Attendance %'],
      class: ['Class', 'Section', 'Total Students', 'Avg Attendance %', 'Classes Held']
    };

    return headers[reportType] || headers.attendance;
  }

  /**
   * Format row data for Excel based on report type
   */
  formatExcelRowData(record, reportType) {
    const formatters = {
      attendance: (r) => [
        r.studentId || '',
        r.name || '',
        r.class || '',
        r.totalDays || 0,
        r.present || 0,
        r.absent || 0,
        r.late || 0,
        r.attendancePercentage ? `${r.attendancePercentage.toFixed(2)}%` : '0.00%'
      ],
      daily: (r) => [
        r.studentId || '',
        r.name || '',
        r.rollNumber || '',
        r.status || '',
        r.time || '',
        r.remarks || ''
      ],
      monthly: (r) => [
        r.studentId || '',
        r.name || '',
        r.class || '',
        r.presentDays || 0,
        r.totalDays || 0,
        r.percentage ? `${r.percentage.toFixed(2)}%` : '0.00%'
      ],
      defaulters: (r) => [
        r.studentId || '',
        r.name || '',
        r.class || '',
        r.attendancePercentage ? `${r.attendancePercentage.toFixed(2)}%` : '0.00%',
        r.totalAbsences || 0,
        r.parentContact || ''
      ],
      subject: (r) => [
        r.subjectName || '',
        r.className || '',
        r.teacherName || '',
        r.totalClasses || 0,
        r.avgAttendance ? `${r.avgAttendance.toFixed(2)}%` : '0.00%'
      ],
      class: (r) => [
        r.className || '',
        r.section || '',
        r.totalStudents || 0,
        r.avgAttendance ? `${r.avgAttendance.toFixed(2)}%` : '0.00%',
        r.classesHeld || 0
      ]
    };

    const formatter = formatters[reportType] || formatters.attendance;
    return formatter(record);
  }

  /**
   * Load template from file
   */
  async loadTemplate(templatePath) {
    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      return handlebars.compile(templateContent);
    } catch (error) {
      // If template doesn't exist, return default template
      return handlebars.compile(this.getDefaultTemplate());
    }
  }

  /**
   * Get default HTML template
   */
  getDefaultTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #2c3e50; margin: 0; }
    .header p { color: #7f8c8d; margin: 5px 0; }
    .info-section { margin: 20px 0; }
    .info-section label { font-weight: bold; color: #34495e; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #3498db; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ecf0f1; }
    tr:nth-child(even) { background-color: #f8f9fa; }
    .footer { margin-top: 30px; text-align: center; color: #7f8c8d; font-size: 12px; }
    .summary { background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 20px; }
    .status-present { color: #27ae60; font-weight: bold; }
    .status-absent { color: #e74c3c; font-weight: bold; }
    .status-late { color: #f39c12; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{reportTitle}}</h1>
    <p>Generated on: {{generatedDate}}</p>
  </div>
  
  <div class="info-section">
    {{#if class}}
      <p><label>Class:</label> {{class.name}}</p>
    {{/if}}
    {{#if subject}}
      <p><label>Subject:</label> {{subject.name}}</p>
    {{/if}}
    {{#if startDate}}
      <p><label>Period:</label> {{startDate}} to {{endDate}}</p>
    {{/if}}
  </div>

  {{#if records}}
  <table>
    <thead>
      <tr>
        <th>Student ID</th>
        <th>Name</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      {{#each records}}
      <tr>
        <td>{{this.studentId}}</td>
        <td>{{this.name}}</td>
        <td class="status-{{this.status}}">{{this.status}}</td>
        <td>{{formatDate this.date}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  {{/if}}

  {{#if summary}}
  <div class="summary">
    <h3>Summary</h3>
    {{#each summary}}
      <p><strong>{{@key}}:</strong> {{this}}</p>
    {{/each}}
  </div>
  {{/if}}

  <div class="footer">
    <p>Virtual Roll Call - Attendance Management System</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Delete old reports (cleanup)
   */
  async cleanupOldReports(daysOld = 30) {
    try {
      const files = await fs.readdir(this.reportsDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filepath = path.join(this.reportsDir, file);
        const stats = await fs.stat(filepath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filepath);
        }
      }

      return { success: true, message: `Cleaned up reports older than ${daysOld} days` };
    } catch (error) {
      throw new Error(`Failed to cleanup old reports: ${error.message}`);
    }
  }

  /**
   * Get report file
   */
  async getReportFile(filename) {
    try {
      const filepath = path.join(this.reportsDir, filename);
      await fs.access(filepath);
      return filepath;
    } catch (error) {
      throw new Error('Report file not found');
    }
  }

  /**
   * Delete report file
   */
  async deleteReportFile(filename) {
    try {
      const filepath = path.join(this.reportsDir, filename);
      await fs.unlink(filepath);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }
}

module.exports = new PDFService();