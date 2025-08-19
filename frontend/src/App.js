import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import Navigation from './components/layout/Navigation';
import Repositories from './components/repositories/Repositories';
import CodeReviewPanel from './components/CodeReviewPanel';
import ReviewHistory from './components/reviewHistory/ReviewHistory';
import Settings from './components/settings/Settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    const savedUser = localStorage.getItem('user_data');
    
    if (savedToken && savedUser) {
      setGithubToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Clear justLoggedIn flag after navigation
  useEffect(() => {
    if (justLoggedIn) {
      const timer = setTimeout(() => setJustLoggedIn(false), 100);
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn]);

  const handleLogin = (token, userData) => {
    setGithubToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    setJustLoggedIn(true);
    
    // Save to localStorage for persistence
    localStorage.setItem('github_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setGithubToken('');
    setUser(null);
    
    // Clear localStorage
    localStorage.removeItem('github_token');
    localStorage.removeItem('user_data');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <Router key={isAuthenticated ? 'authenticated' : 'unauthenticated'}>
      <div className="App">
        <Navigation user={user} onLogout={handleLogout} />
        <div className="container-fluid">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard githubToken={githubToken} />} />
            <Route path="/repositories" element={<Repositories githubToken={githubToken} />} />
            <Route path="/review" element={<CodeReviewPanel githubToken={githubToken} />} />
            <Route path="/history" element={<ReviewHistory githubToken={githubToken} />} />
            <Route path="/settings" element={justLoggedIn ? <Navigate to="/dashboard" replace /> : <Settings user={user} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;


