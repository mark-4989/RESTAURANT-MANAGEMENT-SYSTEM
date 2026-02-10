// waiter-app/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import '../styles/login.css';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For now, we'll do a simple login check
      // Later you can add proper authentication with JWT
      const response = await fetch('http://localhost:5000/api/staff');
      const data = await response.json();

      if (data.success) {
        const staff = data.data.find(s => 
          s.email === email && s.status === 'active'
        );

        if (staff) {
          // In production, verify password with backend
          // For demo, we'll accept any password
          onLogin(staff);
        } else {
          setError('Invalid credentials or inactive account');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/staff');
      const data = await response.json();

      if (data.success) {
        const staff = data.data.find(s => s.role === role && s.status === 'active');
        if (staff) {
          onLogin(staff);
        } else {
          setError(`No active ${role} found. Add sample staff first.`);
        }
      }
    } catch (err) {
      setError('Failed to load demo account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🍽️ Waiter Station</h1>
          <p>Sign in to manage orders</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@dinesmart.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        <div className="demo-section">
          <p className="demo-text">Quick Demo Access:</p>
          <div className="demo-buttons">
            <button 
              onClick={() => handleDemoLogin('waiter')}
              className="demo-btn waiter"
              disabled={loading}
            >
              🍽️ Login as Waiter
            </button>
            <button 
              onClick={() => handleDemoLogin('manager')}
              className="demo-btn manager"
              disabled={loading}
            >
              📊 Login as Manager
            </button>
          </div>
          <small className="demo-note">
            Make sure you've added sample staff in Admin Dashboard first
          </small>
        </div>

        <div className="login-footer">
          <p>DineSmart Restaurant Management System</p>
          <small>Staff Portal v1.0</small>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;