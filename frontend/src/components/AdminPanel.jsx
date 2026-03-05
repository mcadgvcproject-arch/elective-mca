import { useState, useEffect } from 'react';
import api from '../config/api';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const navigate = useNavigate();
  
  // Data States
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [enrollments, setEnrollments] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({ year: '', semester: '', batch: '', search: '', course: '', enrollmentStatus: '' });
  const [courseFilters, setCourseFilters] = useState({ semester: '', search: '' });
  const [enrollmentSemFilter, setEnrollmentSemFilter] = useState('');
  const [expandedCourse, setExpandedCourse] = useState(null);
  
  // Modals
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form Data (for Add/Edit)
  const [currentStudent, setCurrentStudent] = useState(null); // null = add, obj = edit
  const [studentForm, setStudentForm] = useState({ name: '', rollNumber: '', year: 1, semester: 1, batch: '' });
  
  const [currentCourse, setCurrentCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ name: '', teacher: '', teacherEmail: '', capacity: 20, syllabusLink: '', semester: 1, description: '' });
  
  const [uploadFile, setUploadFile] = useState(null);

  // Batch Semester Update
  const [batchSemesterForm, setBatchSemesterForm] = useState({ batch: '', newSemester: '', newYear: '' });
  const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCourses(); // Always fetch courses for filter dropdowns
  }, []);

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'courses') fetchCourses();
    if (activeTab === 'enrollments') fetchEnrollments();
    if (activeTab === 'settings') {
      fetchBatches();
      fetchStudents(); // For batch overview
    }
  }, [activeTab, filters]);

  // --- Fetch Data ---
  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams(filters);
      // Remove empty filters
      for (const [key, value] of params.entries()) {
        if (!value) params.delete(key);
      }
      const res = await api.get(`/api/admin/students?${params.toString()}`);
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/courses');
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/api/admin/batches');
      setBatches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const params = enrollmentSemFilter ? `?semester=${enrollmentSemFilter}` : '';
      const res = await api.get(`/api/admin/enrollments${params}`);
      setEnrollments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'enrollments') fetchEnrollments();
  }, [enrollmentSemFilter]);

  // --- Handlers ---
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilters({ year: '', semester: '', batch: '', search: '', course: '', enrollmentStatus: '' });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const handleExportCSV = () => {
    const headers = ['Name', 'Roll Number', 'Year', 'Semester', 'Batch', 'Selected Course'];
    const csvRows = students.map(s => [
      `"${s.name}"`,
      `"${s.rollNumber}"`,
      s.year,
      s.semester,
      `"${s.batch || '-'}"`,
      `"${s.selectedCourse ? s.selectedCourse.name : 'Not Selected'}"`
    ].join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(students, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `students_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleExportEnrollmentCSV = (courseName, courseStudents) => {
    const headers = ['S.No', 'Name', 'Roll Number', 'Year', 'Semester', 'Batch'];
    const csvRows = courseStudents.map((s, i) => [
      i + 1,
      `"${s.name}"`,
      `"${s.rollNumber}"`,
      s.year,
      s.semester,
      `"${s.batch || '-'}"`
    ].join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeName = courseName.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `${safeName}_students_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // --- Student CRUD ---
  const openStudentModal = (student = null) => {
    if (student) {
      setCurrentStudent(student);
      setStudentForm({ 
        name: student.name, 
        rollNumber: student.rollNumber, 
        year: student.year, 
        semester: student.semester, 
        batch: student.batch 
      });
    } else {
      setCurrentStudent(null);
      setStudentForm({ name: '', rollNumber: '', year: 1, semester: 1, batch: '' });
    }
    setShowStudentModal(true);
  };

  const saveStudent = async (e) => {
    e.preventDefault();
    try {
      if (currentStudent) {
        await api.put(`/api/admin/students/${currentStudent._id}`, studentForm);
        showMessage('✅ Student updated successfully', 'success');
      } else {
        await api.post('/api/admin/students', studentForm);
        showMessage('✅ Student added successfully', 'success');
      }
      setShowStudentModal(false);
      fetchStudents();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Error saving student', 'error');
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/api/admin/students/${id}`);
      fetchStudents();
      showMessage('🗑️ Student deleted', 'success');
    } catch (err) {
      showMessage('Error deleting student', 'error');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    try {
      const res = await api.post('/api/admin/upload-students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showMessage(`✅ ${res.data.message}`, 'success');
      setShowUploadModal(false);
      fetchStudents();
    } catch (err) {
      showMessage('Upload failed', 'error');
    }
  };

  const showMessage = (msg, type = 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
    window.location.reload();
  };

  // --- Course CRUD ---
  const openCourseModal = (course = null) => {
    if (course) {
      setCurrentCourse(course);
      setCourseForm({ 
        name: course.name, 
        teacher: course.teacher, 
        teacherEmail: course.teacherEmail || '',
        capacity: course.capacity, 
        syllabusLink: course.syllabusLink || '', 
        semester: course.semester,
        description: course.description || ''
      });
    } else {
      setCurrentCourse(null);
      setCourseForm({ name: '', teacher: '', teacherEmail: '', capacity: 20, syllabusLink: '', semester: 1, description: '' });
    }
    setShowCourseModal(true);
  };

  const saveCourse = async (e) => {
    e.preventDefault();
    try {
      if (currentCourse) {
        await api.put(`/api/admin/courses/${currentCourse._id}`, courseForm);
        showMessage('✅ Course updated successfully', 'success');
      } else {
        await api.post('/api/courses', courseForm);
        showMessage('✅ Course added successfully', 'success');
      }
      setShowCourseModal(false);
      fetchCourses();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Error saving course', 'error');
    }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`/api/admin/courses/${id}`);
      fetchCourses();
      showMessage('🗑️ Course deleted', 'success');
    } catch (err) {
      showMessage('Error deleting course', 'error');
    }
  };

  // --- Batch Semester Update ---
  const handleBatchSemesterUpdate = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to update semester for all students in batch ${batchSemesterForm.batch}? This will also reset their course selections.`)) return;
    
    setIsUpdatingBatch(true);
    try {
      const res = await api.put('/api/admin/batch-semester', batchSemesterForm);
      showMessage(`✅ ${res.data.message}`, 'success');
      setBatchSemesterForm({ batch: '', newSemester: '', newYear: '' });
      fetchStudents();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Error updating batch semester', 'error');
    } finally {
      setIsUpdatingBatch(false);
    }
  };

  const handleBatchPromote = async (batch) => {
    if (!window.confirm(`Are you sure you want to promote all students in batch ${batch} to the next semester? This will also reset their course selections.`)) return;
    
    setIsUpdatingBatch(true);
    try {
      const res = await api.put('/api/admin/batch-promote', { batch });
      showMessage(`✅ ${res.data.message}`, 'success');
      fetchBatches();
      fetchStudents();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Error promoting batch', 'error');
    } finally {
      setIsUpdatingBatch(false);
    }
  };

  return (
    <div>
      <button className="logout-btn" onClick={handleLogout}>
        🚪 Logout
      </button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <Logo size={50} />
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
      </div>
      <p style={{ color: '#9C7248', marginBottom: '24px' }}>
        Manage students and courses with ease
      </p>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👨‍🎓</div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalStudents}</span>
              <span className="stat-label">Total Students</span>
            </div>
          </div>
          <div className="stat-card stat-card-success">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-value">{stats.enrolledStudents}</span>
              <span className="stat-label">Enrolled</span>
            </div>
          </div>
          <div className="stat-card stat-card-warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <span className="stat-value">{stats.notEnrolledStudents}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-card stat-card-info">
            <div className="stat-icon">📚</div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalCourses}</span>
              <span className="stat-label">Courses</span>
            </div>
          </div>
          <div className="stat-card stat-card-danger">
            <div className="stat-icon">🔴</div>
            <div className="stat-info">
              <span className="stat-value">{stats.fullCourses}</span>
              <span className="stat-label">Full Courses</span>
            </div>
          </div>
        </div>
      )}
      
      {message && (
        <div className={messageType === 'success' ? 'success-message' : 'error'}>
          {message}
        </div>
      )}

      <div className="tabs">
        <div className={`tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
          👨‍🎓 Students {stats ? <span className="tab-badge">{stats.totalStudents}</span> : ''}
        </div>
        <div className={`tab ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
          📚 Courses {stats ? <span className="tab-badge">{stats.totalCourses}</span> : ''}
        </div>
        <div className={`tab ${activeTab === 'enrollments' ? 'active' : ''}`} onClick={() => setActiveTab('enrollments')}>
          📊 Enrollments
        </div>
        <div className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          ⚙️ Batch Settings
        </div>
      </div>

      {activeTab === 'students' && (
        <div className="card">
          <div className="filters">
            <input placeholder="🔍 Search Name/Roll No" name="search" value={filters.search} onChange={handleFilterChange} />
            <select name="year" value={filters.year} onChange={handleFilterChange}>
              <option value="">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
            </select>
            <select name="semester" value={filters.semester} onChange={handleFilterChange}>
              <option value="">All Semesters</option>
              <option value="1">Sem 1</option>
              <option value="2">Sem 2</option>
              <option value="3">Sem 3</option>
              <option value="4">Sem 4</option>
            </select>
            <input placeholder="📅 Batch (e.g. 2024)" name="batch" value={filters.batch} onChange={handleFilterChange} />
            <select name="course" value={filters.course} onChange={handleFilterChange}>
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>📚 {c.name} (Sem {c.semester})</option>
              ))}
            </select>
            <select name="enrollmentStatus" value={filters.enrollmentStatus} onChange={handleFilterChange}>
              <option value="">All Status</option>
              <option value="enrolled">✅ Enrolled</option>
              <option value="not-enrolled">⏳ Not Enrolled</option>
            </select>
          </div>
          <div className="filter-actions">
            <div className="filter-actions-left">
              {hasActiveFilters && (
                <button className="btn btn-clear" onClick={clearFilters}>✕ Clear Filters</button>
              )}
              <span className="results-count">
                {students.length} student{students.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className="filter-actions-right">
              <button className="btn btn-success" onClick={() => openStudentModal()}>➕ Add Student</button>
              <button className="btn" onClick={() => setShowUploadModal(true)}>📤 Upload CSV</button>
              <button className="btn" onClick={handleExportCSV}>📥 Export CSV</button>
              <button className="btn" onClick={handleExportJSON}>📥 Export JSON</button>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No students found</h3>
              <p>{hasActiveFilters ? 'Try adjusting your filters or clear them.' : 'Add students to get started.'}</p>
              {hasActiveFilters && (
                <button className="btn" onClick={clearFilters}>Clear Filters</button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Roll No</th>
                  <th>Year</th>
                  <th>Sem</th>
                  <th>Batch</th>
                  <th>Selected Course</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, index) => (
                  <tr key={s._id}>
                    <td style={{ color: '#9C7248', fontWeight: '600' }}>{index + 1}</td>
                    <td><strong>{s.name}</strong></td>
                    <td><code style={{ background: 'rgba(255, 191, 134, 0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.9em' }}>{s.rollNumber}</code></td>
                    <td>{s.year}</td>
                    <td>{s.semester}</td>
                    <td>{s.batch || '-'}</td>
                    <td>
                      {s.selectedCourse ? (
                        <span className="enrollment-badge enrolled">
                          ✅ {s.selectedCourse.name}
                        </span>
                      ) : (
                        <span className="enrollment-badge not-enrolled">
                          ⏳ Not Selected
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => openStudentModal(s)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteStudent(s._id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="card">
          <div className="filters">
            <input 
              placeholder="🔍 Search courses..." 
              value={courseFilters.search} 
              onChange={e => setCourseFilters({...courseFilters, search: e.target.value})} 
            />
            <select value={courseFilters.semester} onChange={e => setCourseFilters({...courseFilters, semester: e.target.value})}>
              <option value="">All Semesters</option>
              <option value="1">Sem 1</option>
              <option value="2">Sem 2</option>
              <option value="3">Sem 3</option>
              <option value="4">Sem 4</option>
            </select>
            <button className="btn btn-success" onClick={() => openCourseModal()}>➕ Add Course</button>
          </div>
          
          {courses.filter(c => {
            if (courseFilters.semester && c.semester !== parseInt(courseFilters.semester)) return false;
            if (courseFilters.search && !c.name.toLowerCase().includes(courseFilters.search.toLowerCase()) && !c.teacher.toLowerCase().includes(courseFilters.search.toLowerCase())) return false;
            return true;
          }).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>No courses found</h3>
              <p>Add a course to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>📚 Name</th>
                  <th>👨‍🏫 Teacher</th>
                  <th>📅 Semester</th>
                  <th>🪑 Capacity</th>
                  <th>👥 Enrolled</th>
                  <th>📊 Fill</th>
                  <th>⚡ Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.filter(c => {
                  if (courseFilters.semester && c.semester !== parseInt(courseFilters.semester)) return false;
                  if (courseFilters.search && !c.name.toLowerCase().includes(courseFilters.search.toLowerCase()) && !c.teacher.toLowerCase().includes(courseFilters.search.toLowerCase())) return false;
                  return true;
                }).map((c, index) => {
                  const fillPercent = Math.round((c.enrolledStudents.length / c.capacity) * 100);
                  return (
                    <tr key={c._id}>
                      <td style={{ color: '#9C7248', fontWeight: '600' }}>{index + 1}</td>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.teacher}</td>
                      <td><span className="semester-badge">Sem {c.semester}</span></td>
                      <td>{c.capacity}</td>
                      <td>
                        <span className={`enrollment-count ${c.enrolledStudents.length >= c.capacity ? 'full' : c.enrolledStudents.length >= c.capacity * 0.7 ? 'high' : 'normal'}`}>
                          {c.enrolledStudents.length} / {c.capacity}
                        </span>
                      </td>
                      <td>
                        <div className="mini-progress">
                          <div 
                            className={`mini-progress-fill ${fillPercent >= 100 ? 'full' : fillPercent >= 70 ? 'high' : ''}`}
                            style={{ width: `${Math.min(fillPercent, 100)}%` }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8em', color: '#9C7248' }}>{fillPercent}%</span>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => openCourseModal(c)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCourse(c._id)}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'enrollments' && (
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#46281A' }}>📊 Course-wise Enrollments</h2>
          <div className="filters">
            <select value={enrollmentSemFilter} onChange={e => setEnrollmentSemFilter(e.target.value)}>
              <option value="">All Semesters</option>
              <option value="1">Sem 1</option>
              <option value="2">Sem 2</option>
              <option value="3">Sem 3</option>
              <option value="4">Sem 4</option>
            </select>
          </div>

          {!enrollments ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏳</div>
              <h3>Loading enrollments...</h3>
            </div>
          ) : (
            <>
              {enrollments.enrollments.map(course => (
                <div key={course._id} className="enrollment-card">
                  <div 
                    className="enrollment-card-header"
                    onClick={() => setExpandedCourse(expandedCourse === course._id ? null : course._id)}
                  >
                    <div className="enrollment-card-info">
                      <h3 style={{ margin: 0 }}>
                        {expandedCourse === course._id ? '▼' : '▶'} {course.courseName}
                      </h3>
                      <p style={{ margin: '4px 0 0', color: '#9C7248', fontSize: '0.9em' }}>
                        👨‍🏫 {course.teacher} • Sem {course.semester}
                      </p>
                    </div>
                    <div className="enrollment-card-stats">
                      <span className={`enrollment-count ${course.students.length >= course.capacity ? 'full' : course.students.length >= course.capacity * 0.7 ? 'high' : 'normal'}`}>
                        {course.students.length} / {course.capacity}
                      </span>
                      {course.students.length > 0 && (
                        <button 
                          className="btn btn-sm" 
                          onClick={(e) => { e.stopPropagation(); handleExportEnrollmentCSV(course.courseName, course.students); }}
                          title="Export student list"
                        >
                          📥 CSV
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {expandedCourse === course._id && (
                    <div className="enrollment-card-body">
                      {course.students.length === 0 ? (
                        <p style={{ color: '#999', textAlign: 'center', padding: '16px' }}>No students enrolled yet</p>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Name</th>
                              <th>Roll No</th>
                              <th>Year</th>
                              <th>Sem</th>
                              <th>Batch</th>
                            </tr>
                          </thead>
                          <tbody>
                            {course.students.map((s, i) => (
                              <tr key={s._id}>
                                <td>{i + 1}</td>
                                <td><strong>{s.name}</strong></td>
                                <td><code style={{ background: 'rgba(255, 191, 134, 0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.9em' }}>{s.rollNumber}</code></td>
                                <td>{s.year}</td>
                                <td>{s.semester}</td>
                                <td>{s.batch || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Unassigned Students Section */}
              {enrollments.unassignedStudents.length > 0 && (
                <div className="enrollment-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                  <div 
                    className="enrollment-card-header"
                    onClick={() => setExpandedCourse(expandedCourse === 'unassigned' ? null : 'unassigned')}
                  >
                    <div className="enrollment-card-info">
                      <h3 style={{ margin: 0, color: 'var(--danger-dark)' }}>
                        {expandedCourse === 'unassigned' ? '▼' : '▶'} ⏳ Students Without Course Selection
                      </h3>
                    </div>
                    <div className="enrollment-card-stats">
                      <span className="enrollment-count" style={{ background: 'rgba(212, 117, 106, 0.2)', color: '#B85A4F' }}>
                        {enrollments.unassignedStudents.length} students
                      </span>
                    </div>
                  </div>
                  
                  {expandedCourse === 'unassigned' && (
                    <div className="enrollment-card-body">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Roll No</th>
                            <th>Year</th>
                            <th>Sem</th>
                            <th>Batch</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrollments.unassignedStudents.map((s, i) => (
                            <tr key={s._id}>
                              <td>{i + 1}</td>
                              <td><strong>{s.name}</strong></td>
                              <td><code style={{ background: 'rgba(255, 191, 134, 0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.9em' }}>{s.rollNumber}</code></td>
                              <td>{s.year}</td>
                              <td>{s.semester}</td>
                              <td>{s.batch || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {enrollments.enrollments.length === 0 && enrollments.unassignedStudents.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <h3>No enrollment data</h3>
                  <p>Create courses and add students to see enrollment data.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card">
          <h2 style={{ marginBottom: '24px', color: '#46281A' }}>📅 Batch Semester Management</h2>
          
          {/* Quick Promote Section */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '16px', color: '#9C7248' }}>🚀 Quick Promote (Next Semester)</h3>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Click to promote all students in a batch to the next semester. This will automatically update year and reset course selections.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {batches.length === 0 ? (
                <p style={{ color: '#999' }}>No batches found. Add students first.</p>
              ) : (
                batches.map(batch => (
                  <button 
                    key={batch} 
                    className="btn btn-success"
                    onClick={() => handleBatchPromote(batch)}
                    disabled={isUpdatingBatch}
                    style={{ minWidth: '150px' }}
                  >
                    🎓 Batch {batch}
                  </button>
                ))
              )}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '2px dashed rgba(156, 114, 72, 0.2)', margin: '24px 0' }} />

          {/* Manual Update Section */}
          <div>
            <h3 style={{ marginBottom: '16px', color: '#9C7248' }}>✏️ Manual Semester Update</h3>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Set a specific semester and year for all students in a batch.
            </p>
            <form onSubmit={handleBatchSemesterUpdate} style={{ maxWidth: '500px' }}>
              <div className="form-group">
                <label>🎓 Select Batch</label>
                <select 
                  value={batchSemesterForm.batch} 
                  onChange={e => setBatchSemesterForm({...batchSemesterForm, batch: e.target.value})}
                  required
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map(batch => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>📚 New Semester</label>
                <select 
                  value={batchSemesterForm.newSemester} 
                  onChange={e => setBatchSemesterForm({...batchSemesterForm, newSemester: e.target.value})}
                  required
                >
                  <option value="">-- Select Semester --</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                </select>
              </div>
              <div className="form-group">
                <label>📅 New Year (Optional)</label>
                <select 
                  value={batchSemesterForm.newYear} 
                  onChange={e => setBatchSemesterForm({...batchSemesterForm, newYear: e.target.value})}
                >
                  <option value="">-- Keep Current --</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="btn btn-success" 
                disabled={isUpdatingBatch}
                style={{ marginTop: '12px' }}
              >
                {isUpdatingBatch ? '⏳ Updating...' : '💾 Update Batch Semester'}
              </button>
            </form>
          </div>

          <hr style={{ border: 'none', borderTop: '2px dashed rgba(156, 114, 72, 0.2)', margin: '24px 0' }} />

          {/* Batch Overview */}
          <div>
            <h3 style={{ marginBottom: '16px', color: '#9C7248' }}>📊 Batch Overview</h3>
            <table>
              <thead>
                <tr>
                  <th>🎓 Batch</th>
                  <th>👥 Total Students</th>
                  <th>📚 Current Semesters</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(batch => {
                  const batchStudents = students.filter(s => s.batch === batch);
                  const semesters = [...new Set(batchStudents.map(s => s.semester))].sort();
                  return (
                    <tr key={batch}>
                      <td><strong>{batch}</strong></td>
                      <td>{batchStudents.length}</td>
                      <td>
                        {semesters.length > 0 
                          ? semesters.map(s => `Sem ${s}`).join(', ')
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Modal */}
      {showStudentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{currentStudent ? '✏️ Edit Student' : '➕ Add Student'}</h3>
            <form onSubmit={saveStudent}>
              <div className="form-group">
                <label>👤 Name</label>
                <input value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} placeholder="Enter student name" required />
              </div>
              <div className="form-group">
                <label>🎫 Roll Number</label>
                <input value={studentForm.rollNumber} onChange={e => setStudentForm({...studentForm, rollNumber: e.target.value})} placeholder="Enter roll number" required />
              </div>
              <div className="form-group">
                <label>📅 Year</label>
                <select value={studentForm.year} onChange={e => setStudentForm({...studentForm, year: e.target.value})}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
              <div className="form-group">
                <label>📚 Semester</label>
                <select value={studentForm.semester} onChange={e => setStudentForm({...studentForm, semester: e.target.value})}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div className="form-group">
                <label>🎓 Batch</label>
                <input value={studentForm.batch} onChange={e => setStudentForm({...studentForm, batch: e.target.value})} placeholder="e.g. 2024" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-danger" onClick={() => setShowStudentModal(false)}>❌ Cancel</button>
                <button type="submit" className="btn btn-success">💾 Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{currentCourse ? '✏️ Edit Course' : '➕ Add Course'}</h3>
            <form onSubmit={saveCourse}>
              <div className="form-group">
                <label>📚 Course Name</label>
                <input value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} placeholder="Enter course name" required />
              </div>
              <div className="form-group">
                <label>👨‍🏫 Teacher</label>
                <input value={courseForm.teacher} onChange={e => setCourseForm({...courseForm, teacher: e.target.value})} placeholder="Enter teacher name" required />
              </div>
              <div className="form-group">
                <label>📧 Teacher Email (for notifications)</label>
                <input type="email" value={courseForm.teacherEmail} onChange={e => setCourseForm({...courseForm, teacherEmail: e.target.value})} placeholder="teacher@example.com" />
              </div>
              <div className="form-group">
                <label>📅 Semester</label>
                <select value={courseForm.semester} onChange={e => setCourseForm({...courseForm, semester: e.target.value})}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div className="form-group">
                <label>🪑 Capacity</label>
                <input type="number" value={courseForm.capacity} onChange={e => setCourseForm({...courseForm, capacity: e.target.value})} placeholder="Max students" required />
              </div>
              <div className="form-group">
                <label>🔗 Syllabus Link</label>
                <input value={courseForm.syllabusLink} onChange={e => setCourseForm({...courseForm, syllabusLink: e.target.value})} placeholder="https://..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-danger" onClick={() => setShowCourseModal(false)}>❌ Cancel</button>
                <button type="submit" className="btn btn-success">💾 Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>📤 Upload Students (CSV)</h3>
            <p style={{ color: '#9C7248', marginBottom: '20px' }}>
              📋 Required Headers: <code style={{ background: 'rgba(255, 191, 134, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>Name, RollNumber, Year, Semester, Batch</code>
            </p>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>📁 Select CSV File</label>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={e => setUploadFile(e.target.files[0])} 
                  required 
                  style={{ padding: '12px', border: '2px dashed rgba(156, 114, 72, 0.3)', borderRadius: '12px', width: '100%' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-danger" onClick={() => setShowUploadModal(false)}>❌ Cancel</button>
                <button type="submit" className="btn btn-success">⬆️ Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
