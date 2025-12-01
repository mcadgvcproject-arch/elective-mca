import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && storedUser !== "undefined") {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem('user');
      }
    } else {
      localStorage.removeItem('user');
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    // Return null - the HTML has an initial loader that will be replaced
    return null;
  }

  return (
    <Router>
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route 
            path="/dashboard" 
            element={user ? (user.isAdmin ? <Navigate to="/admin" /> : <Dashboard user={user} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={user && user.isAdmin ? <AdminPanel user={user} /> : <Navigate to="/login" />} 
          />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
