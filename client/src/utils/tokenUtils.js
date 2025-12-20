import axios from 'axios';

const backendUrl = 
  process.env.NODE_ENV === 'production' 
    ? 'https://cinimax.onrender.com' 
    : 'http://localhost:5000';

// Function to refresh authentication token
export const refreshAuthToken = async (userId) => {
  try {
    // Call the refresh token endpoint
    const response = await axios.post(`${backendUrl}/api/auth/refresh-token`, {
      userId: userId
    }, { withCredentials: true });
    
    return response.data;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};

// Function to validate current token
export const validateToken = async () => {
  try {
    const response = await axios.get(`${backendUrl}/api/auth/validate`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
};
