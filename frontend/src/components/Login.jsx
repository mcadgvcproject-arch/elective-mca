import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({ rollNumber: '', password: '', username: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const endpoint = isAdmin ? '/api/auth/admin/login' : '/api/auth/student/login';
    const payload = isAdmin 
      ? { username: formData.username, password: formData.password }
      : { rollNumber: formData.rollNumber, password: formData.password };

    try {
      const res = await axios.post(endpoint, payload);
      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data));
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
        navigate(res.data.isAdmin ? '/admin' : '/dashboard');
      } else {
        setError('Login failed: No data received');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">
          <Logo size={80} />
        </div>
        <h2>{isAdmin ? 'Admin Portal' : 'Student Portal'}</h2>
        <p className="subtitle">Welcome to Elective Course Selector</p>
        
        {error && <p className="error">{error}</p>}
        
        <form onSubmit={handleSubmit}>
          {isAdmin ? (
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                name="username" 
                value={formData.username} 
                onChange={handleChange} 
                placeholder="Enter your username"
                required 
              />
            </div>
          ) : (
            <div className="form-group">
              <label>Roll Number</label>
              <input 
                type="text" 
                name="rollNumber" 
                value={formData.rollNumber} 
                onChange={handleChange} 
                placeholder="Enter your roll number"
                required 
              />
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="Enter your password"
              required 
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '10px' }} disabled={isLoading}>
            {isLoading ? '✨ Signing in...' : '🔐 Sign In'}
          </button>
        </form>
        
        <div className="switch-login">
          <button onClick={() => setIsAdmin(!isAdmin)}>
            Switch to {isAdmin ? '👨‍🎓 Student' : '👨‍💼 Admin'} Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
