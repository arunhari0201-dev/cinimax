import { useSelector, useDispatch } from 'react-redux';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOut,
} from '../redux/user/userSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faEnvelope, 
  faLock, 
  faTrash, 
  faSignOutAlt,
  faTicketAlt,
  faSpinner,
  faExclamationCircle,
  faCalendar,
  faFilm,
  faClock,
  faChair,
  faCar
} from '@fortawesome/free-solid-svg-icons';

export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const { currentUser, loading, error } = useSelector((state) => state.user);
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    password: '',
  });
  
  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // profile, bookings
  
  // API base URL
  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  useEffect(() => {
    setUpdateSuccess(false); 
  }, []);
  
  // Fetch user's bookings
  useEffect(() => {
    if (activeTab === 'bookings' && currentUser) {
      fetchBookings();
    }
  }, [activeTab, currentUser]);

  const fetchBookings = async () => {
    if (!currentUser) return;
    
    setLoadingBookings(true);
    setBookingError(null);
    
    try {
      const response = await axios.get(
        `${backendUrl}/api/bookings/user/${currentUser._id}`,
        { withCredentials: true }
      );
      
      setBookings(response.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setBookingError(error.response?.data?.message || error.message || 'Failed to fetch bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(updateUserStart());
      const res = await fetch(`${backendUrl}/api/user/update/${currentUser._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.success === false) {
        dispatch(updateUserFailure(data.message));
        return;
      }
      
      dispatch(updateUserSuccess(data));
      setUpdateSuccess(true);
      
    } catch (error) {
      dispatch(updateUserFailure(error.message));
    }
  };

  const handleDeleteUser = async () => {
    try {
      dispatch(deleteUserStart());
      const res = await fetch(`${backendUrl}/api/user/delete/${currentUser._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.success === false) {
        dispatch(deleteUserFailure(data.message));
        return;
      }
      
      dispatch(deleteUserSuccess(data));
      navigate('/');
      
    } catch (error) {
      dispatch(deleteUserFailure(error.message));
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch(`${backendUrl}/api/auth/signout`, {
        credentials: 'include',
      });
      
      dispatch(signOut());
      navigate('/sign-in');
      
    } catch (error) {
      console.log(error);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Format time for display
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto p-3 flex flex-col md:flex-row">
      {/* Tabs for navigation */}
      <div className="w-full md:w-1/4 mb-6 md:mb-0">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl">
              {currentUser?.username?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}
            </div>
          </div>
          
          <div className="mb-4 text-center">
            <h2 className="text-xl font-semibold">{currentUser?.username}</h2>
            <p className="text-gray-600">{currentUser?.email}</p>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full py-2 px-4 rounded-md flex items-center transition
                ${activeTab === 'profile' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              <FontAwesomeIcon icon={faUser} className="mr-2" />
              Profile Settings
            </button>
            
            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full py-2 px-4 rounded-md flex items-center transition
                ${activeTab === 'bookings' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              <FontAwesomeIcon icon={faTicketAlt} className="mr-2" />
              My Bookings
            </button>
            
            <button
              onClick={handleSignOut}
              className="w-full py-2 px-4 rounded-md flex items-center bg-red-100 hover:bg-red-200 text-red-700 transition"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="w-full md:w-3/4 md:pl-6">
        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-semibold mb-6">Profile Settings</h1>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Username"
                  defaultValue={currentUser.username}
                  id="username"
                  onChange={handleChange}
                  className="border p-3 rounded-lg w-full"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  defaultValue={currentUser.email}
                  id="email"
                  onChange={handleChange}
                  className="border p-3 rounded-lg w-full"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faLock} className="mr-2" />
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  id="password"
                  onChange={handleChange}
                  className="border p-3 rounded-lg w-full"
                />
              </div>
              
              <button
                disabled={loading}
                className="bg-blue-600 text-white rounded-lg p-3 uppercase hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? 'Loading...' : 'Update Profile'}
              </button>
            </form>
            
            <div className="mt-6">
              {error && <p className="text-red-600 mt-2">{error}</p>}
              {updateSuccess && (
                <p className="text-green-600 mt-2">Profile updated successfully!</p>
              )}
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={handleDeleteUser}
                className="flex items-center text-red-600 hover:text-red-800"
              >
                <FontAwesomeIcon icon={faTrash} className="mr-2" />
                Delete Account
              </button>
            </div>
          </div>
        )}
        
        {/* Bookings */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-semibold p-6 border-b">My Bookings</h1>
            
            {loadingBookings ? (
              <div className="flex items-center justify-center py-12">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-600" />
              </div>
            ) : bookingError ? (
              <div className="p-6 text-center">
                <FontAwesomeIcon icon={faExclamationCircle} size="2x" className="text-red-500 mb-2" />
                <p className="text-red-500">{bookingError}</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <FontAwesomeIcon icon={faTicketAlt} size="2x" className="mb-2" />
                <p>You haven't made any bookings yet.</p>
                <button 
                  onClick={() => navigate('/')}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Browse Movies
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {bookings.map(booking => (
                  <div key={booking._id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      {/* Booking details */}
                      <div>
                        <h3 className="text-xl font-bold mb-1">
                          {booking.movieId.name}
                        </h3>
                        <div className="text-sm text-gray-500 space-y-1 mb-3">
                          <p className="flex items-center">
                            <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                            {formatDate(booking.showtimeId.date)}
                          </p>
                          <p className="flex items-center">
                            <FontAwesomeIcon icon={faClock} className="mr-2" />
                            {formatTime(booking.showtimeId.startTime)}
                          </p>
                          <p className="flex items-center">
                            <FontAwesomeIcon icon={faFilm} className="mr-2" />
                            {booking.showtimeId.screen}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="flex items-center">
                            <FontAwesomeIcon icon={faChair} className="mr-2 text-blue-600" />
                            <span className="font-medium mr-2">Seats:</span>
                            {booking.seats.map(seat => seat.seatNumber).join(', ')}
                          </p>
                          
                          {booking.parkingSlots.length > 0 && (
                            <p className="flex items-center">
                              <FontAwesomeIcon icon={faCar} className="mr-2 text-blue-600" />
                              <span className="font-medium mr-2">Parking:</span>
                              {booking.parkingSlots.map(slot => slot.slotNumber).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Booking reference and date */}
                      <div className="bg-gray-100 rounded-lg p-4 text-sm">
                        <p><span className="font-medium">Booking Ref:</span> {booking.bookingReference}</p>
                        <p><span className="font-medium">Amount:</span> ${booking.totalCost}</p>
                        <p><span className="font-medium">Status:</span> {booking.paymentStatus}</p>
                        <p className="text-gray-500 text-xs mt-2">
                          Booked on {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
