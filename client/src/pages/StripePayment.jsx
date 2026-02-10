import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faCheckCircle, faTimesCircle, faSpinner, faLock } from '@fortawesome/free-solid-svg-icons';
import { getMovieImage } from '../utils/movieImages';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Card element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1F2933',
      backgroundColor: '#FFFFFF',
      '::placeholder': {
        color: '#98A2B3',
        opacity: 1,
      },
      iconColor: '#C69D3C',
    },
    invalid: {
      color: '#D64545',
      iconColor: '#D64545',
    },
  },
  hidePostalCode: true,
};

// Payment Form Component
const PaymentForm = ({ bookingData, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentError, setPaymentError] = useState(null);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  // Check authentication on component mount
  useEffect(() => {
    if (!currentUser) {
      Swal.fire({
        title: 'Authentication Required',
        text: 'Please sign in to proceed with payment',
        icon: 'warning',
        confirmButtonText: 'Sign In',
        confirmButtonColor: '#C8A951',
        background: '#FFFFFF',
        color: '#1F2933'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/sign-in');
        }
      });
      return;
    }
  }, [currentUser, navigate]);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      if (!currentUser) {
        console.log('❌ No current user - skipping payment intent creation');
        return;
      }
      
      try {
        console.log('💳 Creating payment intent for user:', currentUser.email);
        
        // Get token from localStorage for Authorization header
        const token = localStorage.getItem('access_token');
        
        const response = await axios.post(`${backendUrl}/api/stripe/create-payment-intent`, {
          amount: bookingData.totalCost,
          currency: 'inr',
          bookingData: {
            movieId: bookingData.movieId,
            showtimeId: bookingData.showtimeId,
            userId: currentUser._id,
            seats: bookingData.seats,
            parkingSlots: bookingData.parkingSlots
          }
        }, { 
          withCredentials: true,
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        setClientSecret(response.data.clientSecret);
        console.log('✅ Payment intent created successfully');
      } catch (error) {
        console.error('❌ Error creating payment intent:', error);
        
        // Handle authentication errors specifically
        if (error.response?.status === 401 || error.response?.status === 403) {
          Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please sign in again.',
            icon: 'warning',
            confirmButtonText: 'Sign In',
            confirmButtonColor: '#C8A951',
            background: '#FFFFFF',
            color: '#1F2933'
          }).then((result) => {
            if (result.isConfirmed) {
              navigate('/sign-in');
            }
          });
        } else {
          setPaymentError('Failed to initialize payment. Please try again.');
        }
      }
    };

    if (bookingData && currentUser) {
      createPaymentIntent();
    }
  }, [bookingData, currentUser, backendUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const cardElement = elements.getElement(CardElement);

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: currentUser.username || currentUser.email,
            email: currentUser.email,
          },
        },
      });

      if (error) {
        console.error('Payment failed:', error);
        setPaymentError(error.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Payment successful - now create the booking
        await onPaymentSuccess(paymentIntent.id);
      }

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#C8A951]/20">
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faLock} className="text-[#C8A951] mr-2" />
          <span className="text-[#F5F5F5] font-medium">Secure Payment with Stripe</span>
        </div>
        
        <div className="mb-4">
          <label className="block text-[#F5F5F5] mb-2 font-medium">Card Details</label>
          <div className="p-3 bg-[#0D0D0D] border border-[#C8A951]/30 rounded focus-within:ring-2 focus-within:ring-[#C8A951] focus-within:border-[#C8A951]">
            <CardElement options={cardElementOptions} />
          </div>
          
          {/* Test Card Information */}
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="text-blue-300 text-sm font-medium mb-2">
              <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
              Test Payment Information
            </div>
            <div className="text-blue-200 text-xs space-y-1">
              <div><strong>Card Number:</strong> 4242 4242 4242 4242</div>
              <div><strong>Expiry:</strong> Any future date (e.g., 12/34)</div>
              <div><strong>CVC:</strong> Any 3 digits (e.g., 123)</div>
              <div><strong>Name:</strong> Any name</div>
              <div className="text-blue-300 mt-2 italic">💡 This is a test environment - no real charges will be made</div>
            </div>
          </div>
        </div>

        {paymentError && (
          <div className="bg-red-900/20 border border-red-500 text-red-300 p-3 rounded mb-4">
            <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
            {paymentError}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing || !clientSecret}
          className={`w-full py-3 px-6 rounded font-semibold flex items-center justify-center transition-colors duration-300
            ${isProcessing || !stripe || !clientSecret
              ? 'bg-[#C8A951]/50 cursor-not-allowed text-[#0D0D0D]' 
              : 'bg-[#C8A951] hover:bg-[#C8A951]/90 text-[#0D0D0D]'
            }`}
        >
          {isProcessing ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
              Processing Payment...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              Pay ₹{bookingData.totalCost}
            </>
          )}
        </button>
      </div>

      <div className="text-xs text-[#F5F5F5]/60 text-center">
        <FontAwesomeIcon icon={faLock} className="mr-1" />
        Your payment information is secure and encrypted
      </div>
    </form>
  );
};

// Main Payment Component
const StripePayment = () => {
  const [bookingData, setBookingData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [expiryTimestamp, setExpiryTimestamp] = useState(null);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  useEffect(() => {
    // Load booking data
    let data = location.state?.bookingData;
    
    if (!data) {
      const storedData = localStorage.getItem('bookingData');
      if (storedData) {
        try {
          data = JSON.parse(storedData);
        } catch (error) {
          console.error('Error parsing stored booking data:', error);
        }
      }
    }

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

    setBookingData(data);
    
    // Set expiry timer if holdUntil is available
    if (data.holdUntil) {
      const expiry = new Date(data.holdUntil).getTime();
      setExpiryTimestamp(expiry);
      
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
  }, [location, navigate]);

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      // Get token for Authorization header
      const token = localStorage.getItem('access_token');
      
      // Create the booking after successful payment
      const response = await axios.post(`${backendUrl}/api/bookings`, {
        movieId: bookingData.movieId,
        showtimeId: bookingData.showtimeId,
        userId: currentUser._id,
        seatIds: bookingData.seats || [],
        parkingSlotIds: bookingData.parkingSlots ? 
          bookingData.parkingSlots.map(slot => 
            typeof slot === 'string' ? slot : slot.slotId || slot._id
          ) : [],
        totalCost: bookingData.totalCost,
        phone: bookingData.phone || bookingData.parkingDetails?.phone || null,
        paymentIntentId: paymentIntentId, // Store Stripe payment intent ID
        paymentMethod: 'stripe'
      }, { 
        withCredentials: true,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

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
      console.error("Booking creation error:", error);
      Swal.fire({
        title: 'Booking Failed',
        text: error.response?.data?.message || 'Payment successful but booking creation failed. Please contact support.',
        icon: 'error',
        confirmButtonText: 'Contact Support'
      });
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
      <div className="max-w-4xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-[#1A1A1A] rounded-lg shadow-lg p-6 border border-[#C8A951]/20">
            <h2 className="text-xl font-semibold mb-4 text-[#F5F5F5]">Order Summary</h2>
            
            {/* Movie Image and Basic Info */}
            {bookingData.movieDetails && (
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#C8A951]/20">
                <img 
                  src={getMovieImage(bookingData.movieDetails)} 
                  alt={bookingData.movieDetails.name || bookingData.movieDetails.title}
                  className="w-20 h-28 object-cover rounded-lg shadow-md"
                  onError={(e) => {
                    e.target.src = '/src/images/new.jpg';
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

            <Elements stripe={stripePromise}>
              <PaymentForm 
                bookingData={bookingData} 
                onPaymentSuccess={handlePaymentSuccess} 
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripePayment;
