import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Logout function - defined first
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    if (!API_URL) {
      console.error('API URL is not configured. Please set REACT_APP_API_URL in your .env file');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Set axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  // Register
  const register = async (userData) => {
    try {
      if (!API_URL) {
        throw new Error('API URL is not configured. Please set REACT_APP_API_URL in your .env file');
      }

      const response = await axios.post(`${API_URL}/auth/register`, userData, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const { token: newToken, ...userInfo } = response.data;
      
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setToken(newToken);
      setUser(userInfo);
      
      return response.data;
    } catch (error) {
      // Handle network errors (backend not reachable)
      if (!error.response) {
        let networkError = 'Network error: Cannot reach backend server. ';
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
          networkError += 'Please ensure the backend is running on port 5000. Start it with: cd backend && npm run dev';
        } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
          networkError += `Please check:\n1. Backend server is running (http://localhost:5000)\n2. REACT_APP_API_URL in .env is set to: http://localhost:5000/api\n3. No firewall is blocking the connection`;
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          networkError += 'Request timed out. The backend server might be slow or unresponsive.';
        } else {
          networkError += `Error: ${error.message || error.code || 'Unknown error'}`;
        }
        
        console.error('Network error during registration:', {
          error,
          code: error.code,
          message: error.message,
          apiUrl: API_URL,
          fullUrl: `${API_URL}/auth/register`
        });
        throw networkError;
      }
      
      // Handle HTTP errors (backend responded with error status)
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Registration failed. Please try again.';
      console.error('Registration error:', error);
      throw errorMessage;
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      const { token: newToken, ...userData } = response.data;
      
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setToken(newToken);
      setUser(userData);
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Login failed. Please check your credentials and try again.';
      console.error('Login error:', error);
      throw errorMessage;
    }
  };

  // Update wallet address
  const updateWallet = async (walletAddress) => {
    try {
      const response = await axios.put(`${API_URL}/auth/wallet`, {
        walletAddress
      });
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Update failed';
    }
  };

  const value = {
    user,
    token,
    loading,
    register,
    login,
    logout,
    updateWallet,
    isAuthenticated: !!token,
    isNGO: user?.role === 'ngo',
    isFunder: user?.role === 'funder'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};