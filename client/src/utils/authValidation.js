import axios from 'axios';

const backendUrl = 
  process.env.NODE_ENV === 'production' 
    ? 'https://cinimax.onrender.com' 
    : 'http://localhost:5000';

// Function to validate current authentication status
export const validateAuthStatus = async () => {
  try {
    const response = await axios.get(`${backendUrl}/api/auth/validate-session`, {
      withCredentials: true
    });
    return { valid: true, user: response.data };
  } catch (error) {
    console.log('Auth validation failed:', error.response?.status);
    return { valid: false, error: error.response?.data };
  }
};

// Function to check if user has admin privileges
export const validateAdminAccess = async () => {
  try {
    const response = await axios.get(`${backendUrl}/api/admin/validate`, {
      withCredentials: true
    });
    return { valid: true, user: response.data };
  } catch (error) {
    console.log('Admin validation failed:', error.response?.status);
    return { valid: false, error: error.response?.data };
  }
};

export default { validateAuthStatus, validateAdminAccess };
