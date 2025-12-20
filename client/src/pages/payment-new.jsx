import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faCheckCircle, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

// Import the shared movie image utility
import { getMovieImage } from '../utils/movieImages';

const Payment = () => {
  const [bookingData, setBookingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [expiryTimestamp, setExpiryTimestamp] = useState(null);

  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  // API base URL
  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  useEffect(() => {
    console.log('Payment page loaded. Current user:', currentUser);
    
    // Try to load booking data from navigation state first, then localStorage
    let data = location.state?.bookingData;
    
    if (!data) {
      // Fallback to localStorage
      const storedData = localStorage.getItem('bookingData');
      if (storedData) {
        try {
          data = JSON.parse(storedData);
        } catch (error) {
          console.error('Error parsing stored booking data:', error);
        }
      }
    }

    console.log('Booking data found:', data);

    if (!data) {
      Swal.fire({
        title: 'No Booking Data',
        text: 'No booking information found. Please select seats first.',
        icon: 'error',
        confirmButtonText: 'Go Back'
      }).then(() => {
        navigate('/');
      });
      return;
    }

    // Remove the authentication check that's blocking the user
    // The authentication will be checked when making the API call instead
    
    // Enhance booking data with navigation state data if available
    if (location.state) {
      data = {
        ...data,
        movieDetails: location.state.movieDetails,
        showtimeDetails: location.state.showtimeDetails,
        selectedSeats: location.state.selectedSeats,
        selectedParking: location.state.selectedParking
      };
    }

    console.log('Enhanced booking data:', data);
    setBookingData(data);
    
    // Set expiry timer if holdUntil is available
    if (data.holdUntil) {
      const expiry = new Date(data.holdUntil).getTime();
      setExpiryTimestamp(expiry);
      
      // Start countdown timer
      const intervalId = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, expiry - now);
        
        if (remaining <= 0) {
          clearInterval(intervalId);
          Swal.fire({
            title: 'Session Expired',
            text: 'Your booking session has expired. Please start over.',
            icon: 'error',
            confirmButtonText: 'Start Again'
          }).then(() => {
            navigate('/');
          });
        } else {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
  }, []);

  const handlePayment = async () => {
    if (!bookingData) {
      Swal.fire({
        title: 'No Booking Data',
        text: 'Booking data is missing. Please try again.',
        icon: 'error'
      });
      return;
    }
    
    if (!currentUser) {
      Swal.fire({
        title: 'Sign In Required',
        text: 'Please sign in to complete your booking',
        icon: 'info',
        confirmButtonText: 'Sign In'
      }).then(() => {
        navigate('/sign-in');
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create the booking with the held seats/parking
      const response = await axios.post(`${backendUrl}/api/bookings`, {
        movieId: bookingData.movieId,
        showtimeId: bookingData.showtimeId,
        userId: currentUser._id,
        seatIds: bookingData.seats || [], // seats is already an array of IDs
        parkingSlotIds: bookingData.parkingSlots ? 
          bookingData.parkingSlots.map(slot => 
            typeof slot === 'string' ? slot : slot.slotId || slot._id
          ) : [],
        totalCost: bookingData.totalCost,
        phone: bookingData.phone || bookingData.parkingDetails?.phone || null
      }, { withCredentials: true });
      
      if (!response.data.booking) {
        throw new Error('Failed to create booking');
      }
      
      // Clear the booking data from localStorage
      localStorage.removeItem('bookingData');
      
      // Show success message
      Swal.fire({
        title: 'Payment Successful!',
        text: `Booking Reference: ${response.data.booking.bookingReference}`,
        icon: 'success',
        confirmButtonText: 'View My Bookings'
      }).then(() => {
        navigate('/profile');
      });
      
    } catch (error) {
      console.error("Payment error:", error);
      
      // If it's a 401/403 error (invalid/expired token), try to fix it
      if (error.response?.status === 403 || error.response?.status === 401) {
        try {
          // First check if we have a valid user in the Redux store
          if (!currentUser || !currentUser._id) {
            throw new Error('No user information available for token refresh');
          }
          
          // Try to refresh the token for the current user
          console.log('Attempting to refresh token for user:', currentUser._id);
          const refreshResponse = await axios.post(`${backendUrl}/api/auth/refresh-token`, {
            userId: currentUser._id
          }, { 
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (refreshResponse.data) {
            // Token refreshed successfully, try payment again
            Swal.fire({
              title: 'Session Refreshed',
              text: 'Your session has been refreshed. Please try your payment again.',
              icon: 'success',
              confirmButtonText: 'Try Again'
            });
            return;
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Clear invalid cookies and redirect to sign in
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + '; secure; samesite=none';
          document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + '; secure; samesite=none';
          
          Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please sign in again.',
            icon: 'warning',
            confirmButtonText: 'Sign In'
          }).then(() => {
            navigate('/sign-in');
          });
        }
        return;
      }
      
      Swal.fire({
        title: 'Payment Failed',
        text: error.response?.data?.message || error.message || 'There was an error processing your payment',
        icon: 'error',
        confirmButtonText: 'Try Again'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!bookingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0D0D]">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-[#C8A951]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-[#F5F5F5]">Complete Your Payment</h1>
        
        {/* User Authentication Status */}
        <div className="bg-[#1A1A1A] border-l-4 border-[#C8A951] p-4 mb-6 rounded-lg">
          <p className="text-[#F5F5F5]">
            <span className="font-medium">User Status:</span>{' '}
            {currentUser ? (
              <span className="text-green-400">✓ Authenticated as {currentUser.username || currentUser.email}</span>
            ) : (
              <span className="text-red-400">✗ Not authenticated</span>
            )}
          </p>
        </div>
        
        {timeRemaining && (
          <div className="bg-[#1A1A1A] border-l-4 border-yellow-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center">
              <p className="text-yellow-400">
                Time remaining to complete payment: <span className="font-bold">{timeRemaining}</span>
              </p>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-[#1A1A1A] rounded-lg shadow-lg p-6 mb-6 border border-[#C8A951]/20">
          <h2 className="text-xl font-semibold mb-4 text-[#F5F5F5]">Order Summary</h2>
          
          {/* Movie Image and Basic Info */}
          {bookingData.movieDetails && (
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#C8A951]/20">
              <img 
                src={getMovieImage(bookingData.movieDetails)} 
                alt={bookingData.movieDetails.name || bookingData.movieDetails.title}
                className="w-20 h-28 object-cover rounded-lg shadow-md"
                onError={(e) => {
                  console.log('Payment page image failed to load:', e.target.src);
                  // Try to use the default new.jpg image
                  const defaultImage = '/src/images/new.jpg';
                  if (e.target.src !== defaultImage) {
                    e.target.src = defaultImage;
                  } else {
                    // If default image also fails, use a generic fallback
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzMzMzMzMyIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
                  }
                }}
              />
              <div>
                <h3 className="text-xl font-semibold text-[#F5F5F5] mb-1">
                  {bookingData.movieDetails.name || bookingData.movieDetails.title || 'N/A'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {bookingData.movieDetails.genre && (
                    <span className="px-2 py-1 bg-[#C8A951] text-[#0D0D0D] text-xs rounded-full">
                      {bookingData.movieDetails.genre}
                    </span>
                  )}
                  {bookingData.movieDetails.duration && (
                    <span className="px-2 py-1 bg-[#1A1A1A] border border-[#C8A951]/30 text-[#F5F5F5] text-xs rounded-full">
                      {bookingData.movieDetails.duration} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Movie Details */}
            <div className="space-y-2 text-[#F5F5F5]">
              <p><span className="font-medium text-[#C8A951]">Screen:</span> {bookingData.showtimeDetails?.screen || 'N/A'}</p>
              <p><span className="font-medium text-[#C8A951]">Date:</span> {bookingData.showtimeDetails?.date ? new Date(bookingData.showtimeDetails.date).toLocaleDateString() : 'N/A'}</p>
              <p><span className="font-medium text-[#C8A951]">Time:</span> {bookingData.showtimeDetails?.startTime ? new Date(bookingData.showtimeDetails.startTime).toLocaleTimeString() : 'N/A'}</p>
            </div>
            
            {/* Seat Details */}
            <div className="space-y-2 text-[#F5F5F5]">
              <p>
                <span className="font-medium text-[#C8A951]">Seats:</span>{' '}
                {bookingData.selectedSeats && Array.isArray(bookingData.selectedSeats) 
                  ? bookingData.selectedSeats.map(seat => seat.seatNumber || seat.number || seat._id).join(', ')
                  : bookingData.seats && Array.isArray(bookingData.seats)
                  ? bookingData.seats.map(seat => seat.seatNumber || seat.number || seat._id).join(', ')
                  : 'No seats selected'
                }
              </p>
              
              <p>
                <span className="font-medium text-[#C8A951]">Seats Cost:</span>{' '}
                ₹{(bookingData.selectedSeats || []).reduce((total, seat) => total + (seat.price || 150), 0)}
              </p>
              
              {(bookingData.selectedParking?.twoWheeler?.length > 0 || bookingData.selectedParking?.fourWheeler?.length > 0) && (
                <>
                  <p>
                    <span className="font-medium text-[#C8A951]">Parking:</span>{' '}
                    {bookingData.selectedParking.twoWheeler?.length > 0 && (
                      `${bookingData.selectedParking.twoWheeler.length} Two-Wheeler${bookingData.selectedParking.twoWheeler.length > 1 ? 's' : ''}`
                    )}
                    {bookingData.selectedParking.twoWheeler?.length > 0 && 
                     bookingData.selectedParking.fourWheeler?.length > 0 && ', '}
                    {bookingData.selectedParking.fourWheeler?.length > 0 && (
                      `${bookingData.selectedParking.fourWheeler.length} Four-Wheeler${bookingData.selectedParking.fourWheeler.length > 1 ? 's' : ''}`
                    )}
                  </p>
                  
                  <p>
                    <span className="font-medium text-[#C8A951]">Parking Cost:</span>{' '}
                    ₹{(bookingData.selectedParking.twoWheeler?.length || 0) * 50 + (bookingData.selectedParking.fourWheeler?.length || 0) * 100}
                  </p>
                </>
              )}
              
              <p className="text-lg font-bold pt-2 border-t border-[#C8A951]/30 mt-2 text-[#C8A951]">
                Total Cost: ₹{bookingData.totalCost}
              </p>
            </div>
          </div>
          
          {/* Contact Information */}
          {(bookingData.phone || currentUser?.phone) && (
            <div className="border-t border-[#C8A951]/20 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-[#C8A951] mb-2">Contact Information</h3>
              <div className="text-[#F5F5F5]">
                <p>
                  <span className="font-medium text-[#C8A951]">Phone:</span>{' '}
                  {bookingData.phone || currentUser?.phone}
                  {(currentUser?.phoneVerified || bookingData.phoneVerified) && (
                    <span className="text-green-500 ml-2">✓ Verified</span>
                  )}
                </p>
                {currentUser?.email && (
                  <p>
                    <span className="font-medium text-[#C8A951]">Email:</span>{' '}
                    {currentUser.email}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment Form */}
        <div className="bg-[#1A1A1A] rounded-lg shadow-lg p-6 border border-[#C8A951]/20">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-[#F5F5F5]">
            <FontAwesomeIcon icon={faCreditCard} className="mr-2 text-[#C8A951]" />
            Payment Details
          </h2>
          
          <div className="mb-6">
            <p className="text-sm text-[#F5F5F5]/80 mb-4">
              This is a demo application. No actual payment will be processed. Click the "Complete Payment" button to simulate a successful payment.
            </p>
            
            {/* Mock Payment Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-[#F5F5F5] mb-1 font-medium">Card Number</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#C8A951]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#C8A951] focus:border-[#C8A951] text-[#F5F5F5] placeholder-[#F5F5F5]/50"
                  placeholder="4242 4242 4242 4242"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#F5F5F5] mb-1 font-medium">Expiration Date</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#C8A951]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#C8A951] focus:border-[#C8A951] text-[#F5F5F5] placeholder-[#F5F5F5]/50"
                    placeholder="MM/YY"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-[#F5F5F5] mb-1 font-medium">CVC</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#C8A951]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#C8A951] focus:border-[#C8A951] text-[#F5F5F5] placeholder-[#F5F5F5]/50"
                    placeholder="123"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[#F5F5F5] mb-1 font-medium">Cardholder Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#C8A951]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#C8A951] focus:border-[#C8A951] text-[#F5F5F5] placeholder-[#F5F5F5]/50"
                  placeholder="John Doe"
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Test Information */}
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="text-blue-300 text-sm font-medium mb-2">
                  <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
                  Test Payment Information
                </div>
                <div className="text-blue-200 text-xs space-y-1">
                  <div><strong>Card Number:</strong> 4242 4242 4242 4242 (or any number shown above)</div>
                  <div><strong>Expiry:</strong> Any future date (e.g., 12/34)</div>
                  <div><strong>CVC:</strong> Any 3 digits (e.g., 123)</div>
                  <div><strong>Name:</strong> Any name</div>
                  <div className="text-blue-300 mt-2 italic">💡 This is a demo - no real payment will be processed</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <button 
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-[#C8A951] text-[#C8A951] rounded hover:bg-[#C8A951] hover:text-[#0D0D0D] transition-colors duration-300"
            >
              Go Back
            </button>
            
            <button
              onClick={handlePayment}
              disabled={isSubmitting}
              className={`px-6 py-3 rounded font-semibold flex items-center transition-colors duration-300
                ${isSubmitting ? 'bg-[#C8A951]/50 cursor-not-allowed text-[#0D0D0D]' : 'bg-[#C8A951] hover:bg-[#C8A951]/90 text-[#0D0D0D]'}`}
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                  Complete Payment (₹{bookingData.totalCost})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
