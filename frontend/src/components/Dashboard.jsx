import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:5000');

const Dashboard = ({ user }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(user.selectedCourse);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [animatingCourse, setAnimatingCourse] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();

    socket.on('courseUpdate', (data) => {
      setCourses((prevCourses) => 
        prevCourses.map(course => 
          course._id === data.courseId 
            ? { ...course, enrolledStudents: new Array(data.enrolledCount) }
            : course
        )
      );
      // Animate the updated course
      setAnimatingCourse(data.courseId);
      setTimeout(() => setAnimatingCourse(null), 1000);
    });

    return () => {
      socket.off('courseUpdate');
    };
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/courses/select/${courseId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCourse(courseId);
      setMessage(res.data.message);
      setMessageType('success');
      // Update local user state if needed
      const updatedUser = { ...user, selectedCourse: courseId };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Selection failed');
      setMessageType('error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
    window.location.reload();
  };

  const getProgressClass = (enrolled, capacity) => {
    const ratio = enrolled / capacity;
    if (ratio >= 1) return 'full';
    if (ratio >= 0.7) return 'high';
    return '';
  };

  const selectedCourseData = courses.find(c => c._id === selectedCourse);

  return (
    <div>
      <button className="logout-btn" onClick={handleLogout}>
        🚪 Logout
      </button>
      
      <h1>Welcome, {user.name} ☕</h1>
      <p style={{ color: '#9C7248', marginBottom: '24px' }}>
        Semester {user.semester} • Choose your elective course wisely
      </p>
      
      {message && (
        <div className={messageType === 'success' ? 'success-message' : 'error'}>
          {messageType === 'success' ? '✅ ' : '⚠️ '}{message}
        </div>
      )}
      
      {selectedCourse ? (
        <div className="card selected" style={{ position: 'relative' }}>
          <h3>🎉 Course Selected Successfully!</h3>
          <p style={{ fontSize: '1.1rem', marginTop: '16px' }}>
            You have enrolled in: <strong>{selectedCourseData?.name || 'Your course'}</strong>
          </p>
          {selectedCourseData && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255, 191, 134, 0.1)', borderRadius: '12px' }}>
              <p><strong>👨‍🏫 Teacher:</strong> {selectedCourseData.teacher}</p>
              {selectedCourseData.syllabusLink && (
                <a href={selectedCourseData.syllabusLink} target="_blank" rel="noopener noreferrer" className="btn" style={{ marginTop: '12px', display: 'inline-block' }}>
                  📚 View Syllabus
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="course-list">
          {courses.map(course => {
            const enrolled = course.enrolledStudents.length;
            const isFull = enrolled >= course.capacity;
            const progressPercent = Math.min((enrolled / course.capacity) * 100, 100);
            const isAnimating = animatingCourse === course._id;
            
            return (
              <div 
                key={course._id} 
                className="card"
                style={{
                  transform: isAnimating ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.3s ease'
                }}
              >
                <h3>{course.name}</h3>
                <p><strong>👨‍🏫 Teacher:</strong> {course.teacher}</p>
                
                <div className={`seat-counter ${isFull ? 'full' : isAnimating ? 'filling' : ''}`}>
                  <span>🪑</span>
                  <span>{enrolled} / {course.capacity} seats</span>
                </div>
                
                <div className="seat-progress">
                  <div 
                    className={`seat-progress-fill ${getProgressClass(enrolled, course.capacity)}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                
                {course.description && (
                  <p style={{ fontSize: '0.9rem', color: '#9C7248', marginTop: '8px' }}>
                    {course.description}
                  </p>
                )}
                
                {course.syllabusLink && (
                  <a href={course.syllabusLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: '12px' }}>
                    📄 View Syllabus
                  </a>
                )}
                
                {isFull ? (
                  <button disabled className="btn" style={{ width: '100%' }}>
                    ❌ Course Full
                  </button>
                ) : (
                  <button onClick={() => handleSelect(course._id)} className="btn btn-success" style={{ width: '100%' }}>
                    ✨ Select This Course
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
