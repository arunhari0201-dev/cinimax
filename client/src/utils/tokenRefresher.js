import axios from 'axios';
import { store } from '../redux/store';
import { signInSuccess, signOut } from '../redux/user/userSlice';

// Get the backend URL from environment or use default
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/**
 * Attempts to refresh the user's authentication token
 * @returns {Promise<boolean>} True if token refreshed successfully, false otherwise
 */
export const refreshToken = async () => {
  try {
    // Get current user from Redux store
    const { currentUser } = store.getState().user;
    
    if (!currentUser || !currentUser._id) {
      console.warn('No user available for token refresh');
      return false;
    }
    
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    
    // Try to refresh token
    const refreshResponse = await axios.post(`${backendUrl}/api/auth/refresh-token`, {
      userId: currentUser._id
    }, { 
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (refreshResponse.data) {
      // Store new token if returned
      if (refreshResponse.data.token) {
        localStorage.setItem('access_token', refreshResponse.data.token);
      }
      // Update Redux store with refreshed user data
      store.dispatch(signInSuccess(refreshResponse.data));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    
    // If refresh fails with 401/403, sign out the user
    if (error.response?.status === 401 || error.response?.status === 403) {
      store.dispatch(signOut());
      localStorage.removeItem('access_token');
      
      // Clear cookies
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + '; secure; samesite=none';
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + '; secure; samesite=none';
    }
    
    return false;
  }
};

/**
 * Sets up axios interceptors to automatically:
 * 1. Add Authorization header to all requests
 * 2. Refresh tokens on 401/403 errors
 */
export const setupTokenRefreshInterceptor = () => {
  // Add request interceptor to automatically add Authorization header
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for automatic token refresh
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If error is 401/403 and we haven't tried refreshing yet
      if (
        (error.response?.status === 401 || error.response?.status === 403) &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        
        try {
          // Try to refresh token
          const refreshed = await refreshToken();
          
          if (refreshed) {
            // Update the Authorization header with new token
            const newToken = localStorage.getItem('access_token');
            if (newToken) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            }
            // Retry the original request
            return axios(originalRequest);
          }
        } catch (refreshError) {
          console.error('Error in refresh interceptor:', refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
};
