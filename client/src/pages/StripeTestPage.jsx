import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const StripeTestPage = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  const testStripePayment = async () => {
    if (!currentUser) {
      Swal.fire({
        title: 'Authentication Required',
        text: 'Please sign in to test Stripe payment',
        icon: 'warning',
        confirmButtonText: 'Sign In',
        confirmButtonColor: '#C8A951',
        background: '#0D0D0D',
        color: '#F5F5F5'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/sign-in');
        }
      });
      return;
    }

    setLoading(true);
    try {
      const testPayment = {
        amount: 1500, // ₹15.00
        currency: 'inr',
        bookingData: {
          movieId: '673be01c9a3d0a0f4a4972f1', // Pushpa 2
          showtimeId: 'test-showtime',
          userId: currentUser._id,
          seats: ['A1', 'A2'],
          parkingSlots: []
        }
      };

      const response = await axios.post(`${backendUrl}/api/stripe/create-payment-intent`, testPayment, {
        withCredentials: true
      });

      Swal.fire({
        title: 'Success!',
        text: `Payment Intent Created: ${response.data.paymentIntentId}`,
        icon: 'success',
        confirmButtonColor: '#C8A951',
        background: '#0D0D0D',
        color: '#F5F5F5'
      });

    } catch (error) {
      console.error('Test payment error:', error);
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'Payment test failed',
        icon: 'error',
        confirmButtonColor: '#E50914',
        background: '#0D0D0D',
        color: '#F5F5F5'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0D] via-[#1A1A1A] to-[#0D0D0D] text-[#F5F5F5] font-poppins">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto bg-[#0D0D0D] border border-[#C8A951]/30 rounded-lg p-8 shadow-xl">
          <h1 className="text-3xl font-playfair font-bold text-[#C8A951] text-center mb-8">
            Stripe Payment Test
          </h1>
          
          {currentUser ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-[#F5F5F5]">Signed in as:</p>
                <p className="text-[#C8A951] font-semibold">{currentUser.email}</p>
              </div>
              
              <button
                onClick={testStripePayment}
                disabled={loading}
                className="w-full bg-[#C8A951] text-[#0D0D0D] font-semibold py-3 px-6 rounded-lg hover:bg-[#DFBD69] transition-colors duration-300 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Stripe Payment'}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-[#F5F5F5]">Please sign in to test payments</p>
              <button
                onClick={() => navigate('/sign-in')}
                className="w-full bg-[#E50914] text-[#F5F5F5] font-semibold py-3 px-6 rounded-lg hover:bg-[#B8070F] transition-colors duration-300"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeTestPage;
