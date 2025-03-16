import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create auth context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch user profile
  const fetchUserProfile = async (token) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      localStorage.removeItem('token');
      setUser(null);
      setError('Session expired, please login again');
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Set user state
      setUser(userData);
      setError(null);
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/register', { 
        name, 
        email, 
        password 
      });
      
      const { token, user: userData } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Set user state
      setUser(userData);
      setError(null);
      
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // For testing purposes - mock user data
  const loginMock = () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin'
    };
    
    localStorage.setItem('token', 'mock-token');
    setUser(mockUser);
    return true;
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    loginMock,
    register,
    logout,
    isAuthenticated: !!user
  };

  // Provide context to children
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 