// backend/utils/database.js - Database Setup & Management
const bcrypt = require('bcryptjs');

// In-memory database (replace with MongoDB/PostgreSQL in production)
let database = {
  users: [],
  classes: [],
  subjects: [],
  schedules: [],
  attendance: [],
  settings: {
    schoolName: 'Virtual Academy',
    academicYear: '2024-2025',
    currentSemester: '1st Semester',
    attendanceDeadline: '10:00', // Time after which attendance is marked late
    timezone: 'UTC'
  }
};

// Counter for generating unique IDs
let counters = {
  users: 0,
  classes: 0,
  subjects: 0,
  schedules: 0,
  attendance: 0,
  students: 0
};

// Initialize database with sample data
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing VirtualRollCall database...');
    
    // Reset database
    database = {
      users: [],
      classes: [],
      subjects: [],
      schedules: [],
      attendance: [],
      settings: {
        schoolName: 'Virtual Academy',
        academicYear: '2024-2025',
        currentSemester: '1st Semester',
        attendanceDeadline: '10:00',
        timezone: 'UTC'
      }
    };

    // Reset counters
    counters = {
      users: 0,
      classes: 0,
      subjects: 0,
      schedules: 0,
      attendance: 0,
      students: 0
    };
    
    // Create default subjects
    const defaultSubjects = [
      { name: 'Mathematics', code: 'MATH', description: 'Advanced Mathematics' },
      { name: 'Physics', code: 'PHYS', description: 'Classical and Modern Physics' },
      { name: 'Chemistry', code: 'CHEM', description: 'Organic and Inorganic Chemistry' },
      { name: 'English', code: 'ENG', description: 'English Language and Literature' },
      { name: 'History', code: 'HIST', description: 'World History and Civilization' },
      { name: 'Biology', code: 'BIO', description: 'Life Sciences and Biology' },
      { name: 'Geography', code: 'GEO', description: 'Physical and Human Geography' },
      { name: 'Computer Science', code: 'CS', description: 'Programming and Computer Science' }
    ];

    for (const subject of defaultSubjects) {
      database.subjects.push({
        id: ++counters.subjects,
        ...subject,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Create default users with hashed passwords
    const defaultUsers = [
      {
        username: 'admin',
        password: await bcrypt.hash('admin123', 12),
        role: 'principal',
        name: 'Dr. Sarah Johnson',
        email: 'principal@virtualacademy.edu',
        phone: '+1-555-0101',
        isActive: true
      },
      {
        username: 'teacher1',
        password: await bcrypt.hash('teacher123', 12),
        role: 'teacher',
        name: 'Ms. Emily Rodriguez',
        email: 'erodriguez@virtualacademy.edu',
        phone: '+1-555-0102',
        subjects: [1, 2], // Math and Physics
        isActive: true
      },
      {
        username: 'teacher2',
        password: await bcrypt.hash('teacher123', 12),
        role: 'teacher',
        name: 'Mr. David Chen',
        email: 'dchen@virtualacademy.edu',
        phone: '+1-555-0103',
        subjects: [3, 4], // Chemistry and English
        isActive: true
      },
      {
        username: 'teacher3',
        password: await bcrypt.hash('teacher123', 12),
        role: 'teacher',
        name: 'Dr. Maria Garcia',
        email: 'mgarcia@virtualacademy.edu',
        phone: '+1-555-0104',
        subjects: [5, 6, 7], // History, Biology, Geography
        isActive: true
      }
    ];

    for (const user of defaultUsers) {
      database.users.push({
        id: ++counters.users,
        ...user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        loginCount: 0
      });
    }
    
    // Sample classes with students
    const defaultClasses = [
      {
        name: '10A',
        grade: 10,
        section: 'A',
        classTeacher: 2, // Ms. Rodriguez
        academicYear: '2024-2025',
        maxStudents: 35,
        students: [
          { name: 'John Smith', studentId: 'ST24001', email: 'john.smith@student.edu', dateOfBirth: '2009-05-15', parentContact: '+1-555-1001' },
          { name: 'Emma Johnson', studentId: 'ST24002', email: 'emma.johnson@student.edu', dateOfBirth: '2009-03-22', parentContact: '+1-555-1002' },
          { name: 'Michael Brown', studentId: 'ST24003', email: 'michael.brown@student.edu', dateOfBirth: '2009-07-08', parentContact: '+1-555-1003' },
          { name: 'Sophia Davis', studentId: 'ST24004', email: 'sophia.davis@student.edu', dateOfBirth: '2009-01-30', parentContact: '+1-555-1004' },
          { name: 'William Wilson', studentId: 'ST24005', email: 'william.wilson@student.edu', dateOfBirth: '2009-04-12', parentContact: '+1-555-1005' },
          { name: 'Olivia Miller', studentId: 'ST24006', email: 'olivia.miller@student.edu', dateOfBirth: '2009-06-25', parentContact: '+1-555-1006' },
          { name: 'James Garcia', studentId: 'ST24007', email: 'james.garcia@student.edu', dateOfBirth: '2009-08-18', parentContact: '+1-555-1007' }
        ]
      },
      {
        name: '10B',
        grade: 10,
        section: 'B',
        classTeacher: 3, // Mr. Chen
        academicYear: '2024-2025',
        maxStudents: 35,
        students: [
          { name: 'Charlotte Martinez', studentId: 'ST24008', email: 'charlotte.martinez@student.edu', dateOfBirth: '2009-02-14', parentContact: '+1-555-1008' },
          { name: 'Benjamin Anderson', studentId: 'ST24009', email: 'benjamin.anderson@student.edu', dateOfBirth: '2009-09-07', parentContact: '+1-555-1009' },
          { name: 'Amelia Taylor', studentId: 'ST24010', email: 'amelia.taylor@student.edu', dateOfBirth: '2009-11-03', parentContact: '+1-555-1010' },
          { name: 'Lucas Thomas', studentId: 'ST24011', email: 'lucas.thomas@student.edu', dateOfBirth: '2009-05-28', parentContact: '+1-555-1011' },
          { name: 'Harper Jackson', studentId: 'ST24012', email: 'harper.jackson@student.edu', dateOfBirth: '2009-03-16', parentContact: '+1-555-1012' },
          { name: 'Ethan White', studentId: 'ST24013', email: 'ethan.white@student.edu', dateOfBirth: '2009-07-21', parentContact: '+1-555-1013' }
        ]
      },
      {
        name: '11A',
        grade: 11,
        section: 'A',
        classTeacher: 4, // Dr. Garcia
        academicYear: '2024-2025',
        maxStudents: 35,
        students: [
          { name: 'Alexander Harris', studentId: 'ST24014', email: 'alexander.harris@student.edu', dateOfBirth: '2008-12-10', parentContact: '+1-555-1014' },
          { name: 'Mia Clark', studentId: 'ST24015', email: 'mia.clark@student.edu', dateOfBirth: '2008-10-05', parentContact: '+1-555-1015' },
          { name: 'Daniel Lewis', studentId: 'ST24016', email: 'daniel.lewis@student.edu', dateOfBirth: '2008-08-19', parentContact: '+1-555-1016' },
          { name: 'Abigail Robinson', studentId: 'ST24017', email: 'abigail.robinson@student.edu', dateOfBirth: '2008-04-27', parentContact: '+1-555-1017' },
          { name: 'Matthew Walker', studentId: 'ST24018', email: 'matthew.walker@student.edu', dateOfBirth: '2008-06-11', parentContact: '+1-555-1018' }
        ]
      }
    ];
    
    for (const classData of defaultClasses) {
      const students = classData.students.map(student => ({
        id: ++counters.students,
        ...student,
        isActive: true,
        enrolledDate: new Date().toISOString()
      }));

      database.classes.push({
        id: ++counters.classes,
        ...classData,
        students,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Sample schedules
    const defaultSchedules = [
      // Teacher 2 (Ms. Rodriguez) - Math & Physics for 10A
      { teacherId: 2, classId: 1, subjectId: 1, dayOfWeek: 'Monday', startTime: '09:00', endTime: '09:50', room: 'Room 101' },
      { teacherId: 2, classId: 1, subjectId: 2, dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '10:50', room: 'Physics Lab' },
      { teacherId: 2, classId: 1, subjectId: 1, dayOfWeek: 'Wednesday', startTime: '11:00', endTime: '11:50', room: 'Room 101' },
      { teacherId: 2, classId: 2, subjectId: 1, dayOfWeek: 'Thursday', startTime: '09:00', endTime: '09:50', room: 'Room 101' },
      { teacherId: 2, classId: 2, subjectId: 2, dayOfWeek: 'Friday', startTime: '10:00', endTime: '10:50', room: 'Physics Lab' },
      
      // Teacher 3 (Mr. Chen) - Chemistry & English
      { teacherId: 3, classId: 2, subjectId: 3, dayOfWeek: 'Monday', startTime: '11:00', endTime: '11:50', room: 'Chemistry Lab' },
      { teacherId: 3, classId: 2, subjectId: 4, dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '09:50', room: 'Room 102' },
      { teacherId: 3, classId: 3, subjectId: 4, dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '10:50', room: 'Room 102' },
      { teacherId: 3, classId: 3, subjectId: 3, dayOfWeek: 'Thursday', startTime: '11:00', endTime: '11:50', room: 'Chemistry Lab' },
      
      // Teacher 4 (Dr. Garcia) - History, Biology, Geography
      { teacherId: 4, classId: 3, subjectId: 5, dayOfWeek: 'Monday', startTime: '08:00', endTime: '08:50', room: 'Room 103' },
      { teacherId: 4, classId: 3, subjectId: 6, dayOfWeek: 'Tuesday', startTime: '11:00', endTime: '11:50', room: 'Biology Lab' },
      { teacherId: 4, classId: 1, subjectId: 7, dayOfWeek: 'Friday', startTime: '09:00', endTime: '09:50', room: 'Room 103' }
    ];
    
    for (const schedule of defaultSchedules) {
      database.schedules.push({
        id: ++counters.schedules,
        ...schedule,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Create some sample attendance records for demonstration
    const sampleDates = [
      '2024-11-01',
      '2024-11-02',
      '2024-11-03',
      '2024-11-04',
      '2024-11-05'
    ];

    for (const date of sampleDates) {
      // Random attendance for each class
      for (let classId = 1; classId <= 3; classId++) {
        const classData = database.classes.find(c => c.id === classId);
        const absentStudents = [];
        
        // Randomly mark 1-2 students absent
        const numAbsent = Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0;
        for (let i = 0; i < numAbsent; i++) {
          const randomStudent = classData.students[Math.floor(Math.random() * classData.students.length)];
          if (!absentStudents.includes(randomStudent.id)) {
            absentStudents.push(randomStudent.id);
          }
        }

        database.attendance.push({
          id: ++counters.attendance,
          teacherId: classData.classTeacher,
          classId: classId,
          subjectId: 1, // Math for demo
          date: date,
          absentStudents: absentStudents,
          presentStudents: classData.students.filter(s => !absentStudents.includes(s.id)).map(s => s.id),
          totalStudents: classData.students.length,
          submittedAt: new Date(`${date}T09:30:00`).toISOString(),
          submittedBy: classData.classTeacher,
          notes: numAbsent > 0 ? 'Regular attendance check' : 'Full attendance today',
          createdAt: new Date(`${date}T09:30:00`).toISOString(),
          updatedAt: new Date(`${date}T09:30:00`).toISOString()
        });
      }
    }
    
    console.log('✅ Database initialized successfully');
    console.log(`📊 Created ${database.users.length} users`);
    console.log(`🏫 Created ${database.classes.length} classes`);
    console.log(`📚 Loaded ${database.subjects.length} subjects`);
    console.log(`📅 Created ${database.schedules.length} schedule entries`);
    console.log(`👥 Enrolled ${database.classes.reduce((sum, c) => sum + c.students.length, 0)} students total`);
    console.log(`📋 Generated ${database.attendance.length} sample attendance records`);
    
    return database;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Database access functions
const getDatabase = () => database;

// User operations
const findUser = (criteria) => {
  return database.users.find(user => {
    return Object.keys(criteria).every(key => {
      if (key === 'username') {
        return user[key].toLowerCase() === criteria[key].toLowerCase();
      }
      return user[key] === criteria[key];
    });
  });
};

const findUserById = (id) => database.users.find(user => user.id === parseInt(id));

const createUser = async (userData) => {
  const user = {
    id: ++counters.users,
    ...userData,
    password: await bcrypt.hash(userData.password, 12),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null,
    loginCount: 0
  };
  
  database.users.push(user);
  return user;
};

const updateUser = (id, updateData) => {
  const userIndex = database.users.findIndex(user => user.id === parseInt(id));
  if (userIndex === -1) return null;
  
  database.users[userIndex] = {
    ...database.users[userIndex],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  return database.users[userIndex];
};

const updateUserLoginInfo = (id) => {
  const userIndex = database.users.findIndex(user => user.id === parseInt(id));
  if (userIndex === -1) return null;
  
  database.users[userIndex].lastLogin = new Date().toISOString();
  database.users[userIndex].loginCount = (database.users[userIndex].loginCount || 0) + 1;
  
  return database.users[userIndex];
};

// Class operations
const findClass = (criteria) => {
  return database.classes.find(cls => {
    return Object.keys(criteria).every(key => cls[key] === criteria[key]);
  });
};

const findClassById = (id) => database.classes.find(cls => cls.id === parseInt(id));

const getAllClasses = (filters = {}) => {
  let classes = database.classes.filter(cls => cls.isActive);
  
  if (filters.grade) {
    classes = classes.filter(cls => cls.grade === parseInt(filters.grade));
  }
  
  if (filters.teacherId) {
    classes = classes.filter(cls => cls.classTeacher === parseInt(filters.teacherId));
  }
  
  return classes;
};

const createClass = (classData) => {
  const newClass = {
    id: ++counters.classes,
    ...classData,
    students: classData.students || [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  database.classes.push(newClass);
  return newClass;
};

const updateClass = (id, updateData) => {
  const classIndex = database.classes.findIndex(cls => cls.id === parseInt(id));
  if (classIndex === -1) return null;
  
  database.classes[classIndex] = {
    ...database.classes[classIndex],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  return database.classes[classIndex];
};

const deleteClass = (id) => {
  const classIndex = database.classes.findIndex(cls => cls.id === parseInt(id));
  if (classIndex === -1) return false;
  
  database.classes[classIndex].isActive = false;
  database.classes[classIndex].updatedAt = new Date().toISOString();
  return true;
};

// Student operations
const addStudentToClass = (classId, studentData) => {
  const classIndex = database.classes.findIndex(cls => cls.id === parseInt(classId));
  if (classIndex === -1) return null;
  
  const student = {
    id: ++counters.students,
    ...studentData,
    isActive: true,
    enrolledDate: new Date().toISOString()
  };
  
  database.classes[classIndex].students.push(student);
  database.classes[classIndex].updatedAt = new Date().toISOString();
  
  return student;
};

const removeStudentFromClass = (classId, studentId) => {
  const classIndex = database.classes.findIndex(cls => cls.id === parseInt(classId));
  if (classIndex === -1) return false;
  
  const studentIndex = database.classes[classIndex].students.findIndex(
    student => student.id === parseInt(studentId)
  );
  
  if (studentIndex === -1) return false;
  
  database.classes[classIndex].students[studentIndex].isActive = false;
  database.classes[classIndex].updatedAt = new Date().toISOString();
  
  return true;
};

const findStudentById = (studentId) => {
  for (const cls of database.classes) {
    const student = cls.students.find(s => s.id === parseInt(studentId) && s.isActive);
    if (student) {
      return { ...student, classId: cls.id, className: cls.name };
    }
  }
  return null;
};

// Subject operations
const getAllSubjects = (filters = {}) => {
  let subjects = database.subjects.filter(subject => subject.isActive);
  
  if (filters.code) {
    subjects = subjects.filter(subject => 
      subject.code.toLowerCase().includes(filters.code.toLowerCase())
    );
  }
  
  return subjects;
};

const findSubjectById = (id) => database.subjects.find(subject => subject.id === parseInt(id));

const createSubject = (subjectData) => {
  const subject = {
    id: ++counters.subjects,
    ...subjectData,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  database.subjects.push(subject);
  return subject;
};

const updateSubject = (id, updateData) => {
  const subjectIndex = database.subjects.findIndex(subject => subject.id === parseInt(id));
  if (subjectIndex === -1) return null;
  
  database.subjects[subjectIndex] = {
    ...database.subjects[subjectIndex],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  return database.subjects[subjectIndex];
};

const deleteSubject = (id) => {
  const subjectIndex = database.subjects.findIndex(subject => subject.id === parseInt(id));
  if (subjectIndex === -1) return false;
  
  database.subjects[subjectIndex].isActive = false;
  database.subjects[subjectIndex].updatedAt = new Date().toISOString();
  return true;
};

// Schedule operations
const getAllSchedules = (filters = {}) => {
  let schedules = database.schedules.filter(schedule => schedule.isActive);
  
  if (filters.teacherId) {
    schedules = schedules.filter(schedule => schedule.teacherId === parseInt(filters.teacherId));
  }
  
  if (filters.classId) {
    schedules = schedules.filter(schedule => schedule.classId === parseInt(filters.classId));
  }
  
  if (filters.dayOfWeek) {
    schedules = schedules.filter(schedule => 
      schedule.dayOfWeek.toLowerCase() === filters.dayOfWeek.toLowerCase()
    );
  }
  
  return schedules;
};

const findScheduleById = (id) => database.schedules.find(schedule => schedule.id === parseInt(id));

const createSchedule = (scheduleData) => {
  const schedule = {
    id: ++counters.schedules,
    ...scheduleData,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  database.schedules.push(schedule);
  return schedule;
};

const updateSchedule = (id, updateData) => {
  const scheduleIndex = database.schedules.findIndex(schedule => schedule.id === parseInt(id));
  if (scheduleIndex === -1) return null;
  
  database.schedules[scheduleIndex] = {
    ...database.schedules[scheduleIndex],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  return database.schedules[scheduleIndex];
};

const deleteSchedule = (id) => {
  const scheduleIndex = database.schedules.findIndex(schedule => schedule.id === parseInt(id));
  if (scheduleIndex === -1) return false;
  
  database.schedules[scheduleIndex].isActive = false;
  database.schedules[scheduleIndex].updatedAt = new Date().toISOString();
  return true;
};

const getTeacherSchedule = (teacherId, filters = {}) => {
  let schedules = database.schedules.filter(
    schedule => schedule.teacherId === parseInt(teacherId) && schedule.isActive
  );
  
  if (filters.dayOfWeek) {
    schedules = schedules.filter(schedule => 
      schedule.dayOfWeek.toLowerCase() === filters.dayOfWeek.toLowerCase()
    );
  }
  
  // Enrich with class and subject information
  return schedules.map(schedule => {
    const classInfo = findClassById(schedule.classId);
    const subjectInfo = findSubjectById(schedule.subjectId);
    
    return {
      ...schedule,
      className: classInfo?.name,
      classGrade: classInfo?.grade,
      subjectName: subjectInfo?.name,
      subjectCode: subjectInfo?.code,
      students: classInfo?.students || []
    };
  });
};

// Attendance operations
const addAttendanceRecord = (attendanceData) => {
  // Check if attendance already exists for this class, subject, and date
  const existingIndex = database.attendance.findIndex(record => 
    record.classId === attendanceData.classId &&
    record.subjectId === attendanceData.subjectId &&
    record.date === attendanceData.date
  );

  const classInfo = findClassById(attendanceData.classId);
  const totalStudents = classInfo ? classInfo.students.filter(s => s.isActive).length : 0;
  const presentStudents = classInfo ? 
    classInfo.students
      .filter(s => s.isActive && !attendanceData.absentStudents.includes(s.id))
      .map(s => s.id) : [];

  const record = {
    id: existingIndex !== -1 ? database.attendance[existingIndex].id : ++counters.attendance,
    ...attendanceData,
    presentStudents,
    totalStudents,
    submittedAt: new Date().toISOString(),
    createdAt: existingIndex !== -1 ? database.attendance[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    // Update existing record
    database.attendance[existingIndex] = record;
    return database.attendance[existingIndex];
  } else {
    // Create new record
    database.attendance.push(record);
    return record;
  }
};

const getAttendanceRecords = (filters = {}) => {
  let records = database.attendance;
  
  if (filters.classId) {
    records = records.filter(record => record.classId === parseInt(filters.classId));
  }
  
  if (filters.teacherId) {
    records = records.filter(record => record.teacherId === parseInt(filters.teacherId));
  }
  
  if (filters.subjectId) {
    records = records.filter(record => record.subjectId === parseInt(filters.subjectId));
  }
  
  if (filters.date) {
    records = records.filter(record => record.date === filters.date);
  }
  
  if (filters.dateRange) {
    const { start, end } = filters.dateRange;
    records = records.filter(record => record.date >= start && record.date <= end);
  }
  
  if (filters.studentId) {
    records = records.filter(record => 
      record.absentStudents.includes(parseInt(filters.studentId)) ||
      record.presentStudents.includes(parseInt(filters.studentId))
    );
  }
  
  return records;
};

const getAttendanceRecord = (classId, subjectId, date) => {
  return database.attendance.find(record =>
    record.classId === parseInt(classId) &&
    record.subjectId === parseInt(subjectId) &&
    record.date === date
  );
};

const updateAttendanceRecord = (id, updateData) => {
  const recordIndex = database.attendance.findIndex(record => record.id === parseInt(id));
  if (recordIndex === -1) return null;
  
  const classInfo = findClassById(updateData.classId || database.attendance[recordIndex].classId);
  const totalStudents = classInfo ? classInfo.students.filter(s => s.isActive).length : 0;
  const absentStudents = updateData.absentStudents || database.attendance[recordIndex].absentStudents;
  const presentStudents = classInfo ? 
    classInfo.students
      .filter(s => s.isActive && !absentStudents.includes(s.id))
      .map(s => s.id) : [];

  database.attendance[recordIndex] = {
    ...database.attendance[recordIndex],
    ...updateData,
    presentStudents,
    totalStudents,
    updatedAt: new Date().toISOString()
  };
  
  return database.attendance[recordIndex];
};

const deleteAttendanceRecord = (id) => {
  const recordIndex = database.attendance.findIndex(record => record.id === parseInt(id));
  if (recordIndex === -1) return false;
  
  database.attendance.splice(recordIndex, 1);
  return true;
};

// Analytics and reporting functions
const getAttendanceStatistics = (filters = {}) => {
  const records = getAttendanceRecords(filters);
  const stats = {
    totalRecords: records.length,
    totalStudents: 0,
    totalPresent: 0,
    totalAbsent: 0,
    attendanceRate: 0,
    classSummary: {},
    subjectSummary: {},
    dailySummary: {}
  };
  
  records.forEach(record => {
    stats.totalStudents += record.totalStudents;
    stats.totalPresent += record.presentStudents.length;
    stats.totalAbsent += record.absentStudents.length;
    
    // Class summary
    if (!stats.classSummary[record.classId]) {
      const classInfo = findClassById(record.classId);
      stats.classSummary[record.classId] = {
        className: classInfo?.name,
        totalRecords: 0,
        totalPresent: 0,
        totalAbsent: 0
      };
    }
    stats.classSummary[record.classId].totalRecords++;
    stats.classSummary[record.classId].totalPresent += record.presentStudents.length;
    stats.classSummary[record.classId].totalAbsent += record.absentStudents.length;
    
    // Subject summary
    if (!stats.subjectSummary[record.subjectId]) {
      const subjectInfo = findSubjectById(record.subjectId);
      stats.subjectSummary[record.subjectId] = {
        subjectName: subjectInfo?.name,
        totalRecords: 0,
        totalPresent: 0,
        totalAbsent: 0
      };
    }
    stats.subjectSummary[record.subjectId].totalRecords++;
    stats.subjectSummary[record.subjectId].totalPresent += record.presentStudents.length;
    stats.subjectSummary[record.subjectId].totalAbsent += record.absentStudents.length;
    
    // Daily summary
    if (!stats.dailySummary[record.date]) {
      stats.dailySummary[record.date] = {
        totalRecords: 0,
        totalPresent: 0,
        totalAbsent: 0
      };
    }
    stats.dailySummary[record.date].totalRecords++;
    stats.dailySummary[record.date].totalPresent += record.presentStudents.length;
    stats.dailySummary[record.date].totalAbsent += record.absentStudents.length;
  });
  
  // Calculate attendance rate
  if (stats.totalStudents > 0) {
    stats.attendanceRate = ((stats.totalPresent / stats.totalStudents) * 100).toFixed(2);
  }
  
  return stats;
};

const getStudentAttendanceHistory = (studentId, filters = {}) => {
  const records = getAttendanceRecords(filters);
  const studentHistory = [];
  
  records.forEach(record => {
    const isPresent = record.presentStudents.includes(parseInt(studentId));
    const isAbsent = record.absentStudents.includes(parseInt(studentId));
    
    if (isPresent || isAbsent) {
      const classInfo = findClassById(record.classId);
      const subjectInfo = findSubjectById(record.subjectId);
      
      studentHistory.push({
        date: record.date,
        classId: record.classId,
        className: classInfo?.name,
        subjectId: record.subjectId,
        subjectName: subjectInfo?.name,
        status: isPresent ? 'present' : 'absent',
        submittedAt: record.submittedAt
      });
    }
  });
  
  return studentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Settings operations
const getSettings = () => database.settings;

const updateSettings = (newSettings) => {
  database.settings = { ...database.settings, ...newSettings };
  return database.settings;
};

// Backup and restore functions
const exportDatabase = () => {
  return {
    ...database,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };
};

const importDatabase = (importData) => {
  if (!importData || typeof importData !== 'object') {
    throw new Error('Invalid import data');
  }
  
  database = {
    users: importData.users || [],
    classes: importData.classes || [],
    subjects: importData.subjects || [],
    schedules: importData.schedules || [],
    attendance: importData.attendance || [],
    settings: importData.settings || database.settings
  };
  
  // Update counters
  counters.users = Math.max(...database.users.map(u => u.id), 0);
  counters.classes = Math.max(...database.classes.map(c => c.id), 0);
  counters.subjects = Math.max(...database.subjects.map(s => s.id), 0);
  counters.schedules = Math.max(...database.schedules.map(s => s.id), 0);
  counters.attendance = Math.max(...database.attendance.map(a => a.id), 0);
  counters.students = Math.max(
    ...database.classes.flatMap(c => c.students.map(s => s.id)), 0
  );
  
  return database;
};

// Search functions
const searchStudents = (query) => {
  const results = [];
  const searchTerm = query.toLowerCase();
  
  database.classes.forEach(cls => {
    cls.students.forEach(student => {
      if (student.isActive && 
          (student.name.toLowerCase().includes(searchTerm) ||
           student.studentId.toLowerCase().includes(searchTerm) ||
           student.email.toLowerCase().includes(searchTerm))) {
        results.push({
          ...student,
          classId: cls.id,
          className: cls.name,
          grade: cls.grade
        });
      }
    });
  });
  
  return results;
};

const searchClasses = (query) => {
  const searchTerm = query.toLowerCase();
  return database.classes.filter(cls => 
    cls.isActive &&
    (cls.name.toLowerCase().includes(searchTerm) ||
     cls.grade.toString().includes(searchTerm) ||
     cls.section.toLowerCase().includes(searchTerm))
  );
};

module.exports = {
  initializeDatabase,
  getDatabase,
  
  // User operations
  findUser,
  findUserById,
  createUser,
  updateUser,
  updateUserLoginInfo,
  
  // Class operations
  findClass,
  findClassById,
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
  
  // Student operations
  addStudentToClass,
  removeStudentFromClass,
  findStudentById,
  
  // Subject operations
  getAllSubjects,
  findSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  
  // Schedule operations
  getAllSchedules,
  findScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getTeacherSchedule,
  
  // Attendance operations
  addAttendanceRecord,
  getAttendanceRecords,
  getAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  
  // Analytics
  getAttendanceStatistics,
  getStudentAttendanceHistory,
  
  // Settings
  getSettings,
  updateSettings,
  
  // Backup/Restore
  exportDatabase,
  importDatabase,
  
  // Search
  searchStudents,
  searchClasses
};