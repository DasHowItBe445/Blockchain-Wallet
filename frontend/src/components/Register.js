import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'funder',
    description: '',
    category: '',
    registrationNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: '3rem 1rem'
  };

  const boxStyle = {
    maxWidth: '28rem',
    width: '100%'
  };

  const headingStyle = {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center'
  };

  const formStyle = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    marginTop: '2rem'
  };

  const errorStyle = {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#991b1b',
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
    marginBottom: '1rem'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const buttonStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '0.625rem 1rem',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.375rem',
    color: 'white',
    backgroundColor: '#3b82f6',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    marginTop: '1.5rem'
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <h2 style={headingStyle}>Create your account</h2>
        <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#6b7280' }}>
          Join TrustFund DAO Platform
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              style={inputStyle}
              placeholder="John Doe"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              name="password"
              required
              minLength="6"
              value={formData.password}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Min 6 characters"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>I am a</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ ...inputStyle, backgroundColor: 'white' }}
            >
              <option value="funder">Funder</option>
              <option value="ngo">NGO</option>
            </select>
          </div>

          {formData.role === 'ngo' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>NGO Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  placeholder="Brief description of your NGO"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="e.g., Education, Health, Environment"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Registration Number</label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Official registration number"
                />
              </div>
            </>
          )}

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Creating account...' : 'Register'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a href="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.875rem' }}>
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;