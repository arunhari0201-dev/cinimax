
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';
import AdminPrivateRoute from './components/AdminPrivateRoute';
import DebugPage from './pages/DebugPage';

import TicketsNew from './pages/Tickets-new';
import MovieDetails from './pages/MovieDetails';
import Faq from './pages/Faq';
import Contact from './pages/Contact';
import Pricing from './pages/Pricing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import CancellationRefund from './pages/CancellationRefund';

import PaymentNew from './pages/payment-new';
import StripePayment from './pages/StripePayment';
import StripeTestPage from './pages/StripeTestPage';
import PaymentMethodSelection from './pages/PaymentMethodSelection';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from './redux/user/userSlice';
import { connectSocket, disconnectSocket } from './services/socketService';
import { setupTokenRefreshInterceptor } from './utils/tokenRefresher';

// Admin Components
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import MovieManagement from './pages/admin/MovieManagement';
import BookingManagement from './pages/admin/BookingManagement';
import Reports from './pages/admin/Reports';
import ShowtimesManagement from './pages/admin/ShowtimesManagement';
import MovieShowtimeManagement from './pages/admin/MovieShowtimeManagement';

export default function App() {
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [skipSessionValidation, setSkipSessionValidation] = useState(false);

  // Listen for sign-in events to skip immediate validation
  useEffect(() => {
    const handleSignIn = () => {
      setSkipSessionValidation(true);
      // Re-enable validation after 10 seconds
      setTimeout(() => setSkipSessionValidation(false), 10000);
    };

    // Listen for successful sign-ins
    if (currentUser && !skipSessionValidation) {
      handleSignIn();
    }
  }, [currentUser]);

  // Validate session on app load
  useEffect(() => {
    const validateSession = async () => {
      if (currentUser && !skipSessionValidation) {
        const backendUrl = 
          process.env.NODE_ENV === 'production' 
            ? 'https://cinimax.onrender.com' 
            : 'http://localhost:5000';
        
        try {
          console.log('🔍 Validating session for user:', currentUser.username);
          const response = await fetch(`${backendUrl}/api/auth/validate-session`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.valid) {
            console.log('🔄 Session invalid, clearing user state');
            dispatch(signOut());
          } else {
            console.log('✅ Session valid, user authenticated');
          }
        } catch (error) {
          console.error('❌ Session validation failed:', error);
          // Only sign out for specific authentication errors, not network issues
          if (error.message.includes('401') || error.message.includes('403')) {
            console.log('🔄 Authentication error, clearing user state');
            dispatch(signOut());
          } else {
            console.log('🔄 Network error during session validation, keeping user logged in');
          }
        }
      }
    };

    // Only validate session if user has been in Redux state for more than 5 seconds
    // This prevents immediate validation after sign-in
    if (currentUser && !skipSessionValidation) {
      const timer = setTimeout(validateSession, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, dispatch, skipSessionValidation]);

  // Wake up the backend server on app load (Render free tier goes to sleep)
  useEffect(() => {
    const wakeUpServer = async () => {
      const backendUrl = 
        process.env.NODE_ENV === 'production' 
          ? 'https://cinimax.onrender.com' 
          : 'http://localhost:5000';
      
      try {
        console.log('🔄 Waking up backend server...');
        const response = await fetch(`${backendUrl}/health`, {
          method: 'GET',
          mode: 'cors',
        });
        if (response.ok) {
          console.log('✅ Backend server is awake');
        }
      } catch (error) {
        console.log('⏳ Backend server is starting up, may take 30-60 seconds...');
      }
    };
    
    wakeUpServer();
  }, []);

  // Initialize and clean up socket connection
  useEffect(() => {
    // Connect to socket server on app load
    connectSocket();
    
    // Setup axios interceptors for automatic token refresh
    setupTokenRefreshInterceptor();
    
    // Disconnect socket when app unmounts
    return () => {
      disconnectSocket();
    };
  }, []);
  
  return (
    <BrowserRouter>
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/debug' element={<DebugPage />} />
          <Route path='/stripe-test' element={<StripeTestPage />} />
          <Route path='/about' element={<About />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/pricing' element={<Pricing />} />
          <Route path='/privacy-policy' element={<PrivacyPolicy />} />
          <Route path='/terms-conditions' element={<TermsConditions />} />
          <Route path='/cancellation-refund' element={<CancellationRefund />} />
          
          {/* Protected booking and payment routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/movie/:movieId" element={<MovieDetails />} />
            <Route path="/tickets/:movieId/:showtimeId" element={<TicketsNew />} />
            <Route path='/payment-method' element={<PaymentMethodSelection />} />
            <Route path='/payment-new' element={<PaymentNew />} />
            <Route path='/stripe-payment' element={<StripePayment />} />
          </Route>
          
          {/* Legacy routes (fallback) */}

          
          <Route path='/faq' element={<Faq />} />
          <Route path='/sign-in' element={<SignIn />} />
          <Route path='/sign-up' element={<SignUp />} />
       
          <Route element={<PrivateRoute />}>
            <Route path='/profile' element={<Profile />} /> {/* Default to new profile */}
            <Route path='/profile-legacy' element={<Profile />} /> {/* Kept for backward compatibility */}
          </Route>

          {/* Admin Routes */}
          <Route path='/admin/dashboard' element={
            <AdminPrivateRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminPrivateRoute>
          } />
          <Route path='/admin/users' element={
            <AdminPrivateRoute>
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            </AdminPrivateRoute>
          } />
          <Route path='/admin/movies' element={
            <AdminPrivateRoute>
              <AdminLayout>
                <MovieManagement />
              </AdminLayout>
            </AdminPrivateRoute>
          } />
          <Route path='/admin/bookings' element={
            <AdminPrivateRoute>
              <AdminLayout>
                <BookingManagement />
              </AdminLayout>
            </AdminPrivateRoute>
          } />
          <Route path='/admin/reports' element={
            <AdminPrivateRoute>
              <AdminLayout>
                <Reports />
              </AdminLayout>
            </AdminPrivateRoute>
          } />
          <Route path='/admin/showtimes' element={
            <AdminPrivateRoute>
              <AdminLayout>
                <ShowtimesManagement />
              </AdminLayout>
            </AdminPrivateRoute>
          } />
          <Route path='/admin/movieshowtimes' element={
            <AdminPrivateRoute>
              <AdminLayout>
                <MovieShowtimeManagement />
              </AdminLayout>
            </AdminPrivateRoute>
          } />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
