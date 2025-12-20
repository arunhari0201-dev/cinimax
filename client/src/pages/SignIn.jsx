
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaEnvelope, FaLock } from 'react-icons/fa'; // Importing icons for inputs and Google
import {
  signInStart,
  signInSuccess,
  signInFailure,
} from '../redux/user/userSlice';
import OAuth from '../components/OAuth';

export default function SignIn() {
  const [formData, setFormData] = useState({});
  const { loading, error } = useSelector((state) => state.user);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(signInStart());
      console.log('🔐 Starting signin to:', `${backendUrl}/api/auth/signin`);
   const res = await fetch(`${backendUrl}/api/auth/signin`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // ✅ Add this line
  body: JSON.stringify(formData),
});

      console.log('📡 SignIn response status:', res.status);
      console.log('🍪 Response headers:', res.headers);
      const data = await res.json();
      console.log('📋 SignIn data received:', data);
      
      if (data.success === false) {
        dispatch(signInFailure(data));
        return;
      }
      dispatch(signInSuccess(data));
      
      // Check user role and redirect accordingly
      if (data.role === 'admin' || data.role === 'manager' || data.role === 'staff') {
        console.log('👑 Admin user detected, redirecting to dashboard');
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('❌ SignIn error:', error);
      dispatch(signInFailure(error));
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto bg-[#0D0D0D] border border-[#C8A951]/30 shadow-xl mt-20 transform transition-all hover:shadow-2xl duration-300" style={{boxShadow: '0 0 25px rgba(0, 0, 0, 0.7), 0 0 15px rgba(200, 169, 81, 0.2)'}}>
      <h1 className="text-4xl text-center font-playfair font-bold text-[#C8A951] my-6 tracking-wide animate-fadeIn" style={{textShadow: '0 0 10px rgba(200, 169, 81, 0.3)'}}>
        Sign In
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="relative group">
          <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#C8A951] transition-all duration-300 group-hover:scale-110" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
          <input
            type="email"
            placeholder="Email"
            id="email"
            className="bg-[#0D0D0D] pl-12 p-3 w-full border border-[#C8A951]/30 text-[#F5F5F5] focus:outline-none focus:border-[#C8A951] transition duration-300 font-poppins"
            style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.3)'}}
            onChange={handleChange}
          />
        </div>
        <div className="relative group">
          <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#C8A951] transition-all duration-300 group-hover:scale-110" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
          <input
            type="password"
            placeholder="Password"
            id="password"
            className="bg-[#0D0D0D] pl-12 p-3 w-full border border-[#C8A951]/30 text-[#F5F5F5] focus:outline-none focus:border-[#C8A951] transition duration-300 font-poppins"
            style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.3)'}}
            onChange={handleChange}
          />
        </div>
        <button
          disabled={loading}
          className="bg-[#0D0D0D] border border-[#C8A951] text-[#F5F5F5] font-cinzel font-semibold p-3 uppercase tracking-wide transition-all duration-300 hover:shadow-lg disabled:opacity-80 mt-2"
          style={{boxShadow: '0 0 10px rgba(200, 169, 81, 0.2)'}}
        >
          {loading ? 'Loading...' : 'Sign In'}
        </button>
        <div className="flex items-center gap-3">
          <OAuth />
        </div>
      </form>
      <div className="flex gap-2 mt-6 justify-center text-sm text-[#F5F5F5] font-poppins">
        <p>Don't have an account?</p>
        <Link to="/sign-up" className="text-[#C8A951] hover:text-[#E50914] transition-colors duration-300 border-b border-transparent hover:border-[#E50914]">
          Sign up
        </Link>
      </div>
      {error && (
        <p className="text-[#E50914] mt-4 text-center font-poppins">
          {error.message || 'Something went wrong!'}
        </p>
      )}
    </div>
  );
}