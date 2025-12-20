import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { app } from '../firebase';
import { useDispatch } from 'react-redux';
import { signInSuccess } from '../redux/user/userSlice';
import { useNavigate } from 'react-router-dom';

export default function OAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  const handleGoogleClick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const auth = getAuth(app);

      const result = await signInWithPopup(auth, provider);
    const res = await fetch(`${backendUrl}/api/auth/google`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // ✅ Include this line
  body: JSON.stringify({
    name: result.user.displayName,
    email: result.user.email,
    photo: result.user.photoURL,
  }),
});

      const data = await res.json();
      console.log(data);
      
      // Store token in localStorage for cross-origin requests
      if (data.token) {
        localStorage.setItem('access_token', data.token);
        console.log('🔑 Token stored in localStorage');
      }
      
      dispatch(signInSuccess(data));
      navigate('/');
    } catch (error) {
      console.log('could not login with google', error);
    }
  };

  return (
<button
  type="button"
  onClick={handleGoogleClick}
  className="bg-[#0D0D0D] text-[#F5F5F5] font-poppins font-medium p-3 text-lg w-full max-w-md shadow-md uppercase tracking-wide transition duration-300 transform hover:shadow-[#C8A951]/30 disabled:opacity-80 border border-[#C8A951]"
  style={{boxShadow: '0 0 10px rgba(200, 169, 81, 0.2)'}}
>
  Continue with Google
</button>

  );
}
