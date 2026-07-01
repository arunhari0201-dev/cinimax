# 🔐 AUTHENTICATION & AUTHORIZATION FLOW

## 📋 Table of Contents
1. [Authentication Overview](#authentication-overview)
2. [JWT Token Architecture](#jwt-token-architecture)
3. [Sign Up Flow](#sign-up-flow)
4. [Sign In Flow](#sign-in-flow)
5. [Google OAuth Flow](#google-oauth-flow)
6. [Token Refresh Flow](#token-refresh-flow)
7. [Authorization (RBAC)](#authorization-rbac)
8. [Session Management](#session-management)
9. [Security Measures](#security-measures)
10. [Interview Q&A](#interview-qa)

---

## 🎯 Authentication Overview

### **Authentication Strategy**

This application uses**JWT (JSON Web Token)** based **stateless authentication** with the following characteristics:

✅ **Stateless**: Server doesn't store session data  
✅ **Scalable**: Works across multiple servers  
✅ **Secure**: Signed tokens prevent tampering  
✅ **Flexible**: Token contains user info (claims)  
✅ **Expirable**: Tokens have 7-day lifetime  

### **Why JWT over Session-Based Auth?**

| Aspect | JWT (Our Choice) | Session-Based |
|--------|------------------|---------------|
| Storage | Client-side (cookie/localStorage) | Server-side (Redis/DB) |
| Scalability | ✅ Horizontal scaling easy | ❌ Requires shared session store |
| Server State | ✅ Stateless | ❌ Stateful |
| Cross-Domain | ✅ Works well (CORS) | ⚠️ More complex |
| Revocation | ⚠️ Harder to revoke | ✅ Easy to revoke |
| Performance | ✅ No DB lookup | ⚠️ DB lookup every request |

---

## 🎫 JWT Token Architecture

### **Token Structure**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0dXNlcjEyM2FiYzQ1NmRlZiIsImlhdCI6MTcwOTY0MDAwMCwiZXhwIjoxNzEwMjQ0ODAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

│                  HEADER                  │                PAYLOAD                │           SIGNATURE          │
```

### **Header**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```
- **alg**: Algorithm used for signing (HMAC SHA256)
- **typ**: Token type (JWT)

### **Payload (Claims)**
```json
{
  "id": "64user123abc456def",  // User ID
  "iat": 1709640000,            // Issued At timestamp
  "exp": 1710244800             // Expiry timestamp (7 days)
}
```

### **Signature**
```javascript
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  process.env.JWT_SECRET
)
```

### **Token Generation Code**

```javascript
// backend/controllers/auth.controller.js
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { id: user._id },                    // Payload
  process.env.JWT_SECRET,               // Secret key
  { expiresIn: '7d' }                   // Expiry
);
```

### **Token Verification Code**

```javascript
// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1] 
              || req.cookies.access_token;
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    req.user = decoded;  // Attach user to request
    next();
  });
};
```

---

## 📝 Sign Up Flow

### **Visual Flow Diagram**

```
USER                    FRONTEND                 BACKEND                 DATABASE
  │                        │                        │                        │
  │  Fills signup form     │                        │                        │
  │ (username, email, pwd) │                        │                        │
  ├───────────────────────>│                        │                        │
  │                        │                        │                        │
  │                        │  POST /api/auth/signup │                        │
  │                        │  {username, email,     │                        │
  │                        │   password}            │                        │
  │                        ├───────────────────────>│                        │
  │                        │                        │                        │
  │                        │                        │  1. Validate input     │
  │                        │                        │  2. Check if user      │
  │                        │                        │     exists             │
  │                        │                        ├───────────────────────>│
  │                        │                        │    findOne({email})    │
  │                        │                        │<───────────────────────┤
  │                        │                        │   null (user not found)│
  │                        │                        │                        │
  │                        │                        │  3. Hash password      │
  │                        │                        │     (bcrypt, 10 rounds)│
  │                        │                        │                        │
  │                        │                        │  4. Save new user      │
  │                        │                        ├───────────────────────>│
  │                        │                        │    User.save()         │
  │                        │                        │<───────────────────────┤
  │                        │                        │    User created        │
  │                        │                        │                        │
  │                        │    201 Created         │                        │
  │                        │    {message: "User     │                        │
  │                        │     created"}          │                        │
  │                        │<───────────────────────┤                        │
  │                        │                        │                        │
  │   Show success message │                        │                        │
  │   Redirect to /signin  │                        │                        │
  │<───────────────────────┤                        │                        │
  │                        │                        │                        │
```

### **Backend Code Breakdown**

```javascript
// controllers/auth.controller.js
export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  
  // ============== STEP 1: INPUT VALIDATION ==============
  if (!username || !email || !password) {
    return next(errorHandler(400, 'All fields are required'));
  }
  
  if (password.length < 6) {
    return next(errorHandler(400, 'Password must be at least 6 characters'));
  }
  
  try {
    // ============== STEP 2: CHECK EXISTING USER ==============
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return next(errorHandler(400, 'Email already exists'));
      }
      if (existingUser.username === username) {
        return next(errorHandler(400, 'Username already exists'));
      }
    }
    
    // ============== STEP 3: HASH PASSWORD ==============
    // Salt rounds = 10 (2^10 = 1024 iterations)
    const hashedPassword = bcryptjs.hashSync(password, 10);
    
    // ============== STEP 4: CREATE USER ==============
    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword 
    });
    
    await newUser.save();
    
    // ============== STEP 5: SEND RESPONSE ==============
    res.status(201).json({ message: 'User created successfully' });
    
  } catch (error) {
    next(error);
  }
};
```

### **Frontend Code**

```javascript
// pages/SignUp.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/signup`, {
      username: formData.username,
      email: formData.email,
      password: formData.password
    });
    
    if (response.status === 201) {
      toast.success('Account created successfully!');
      navigate('/signin');
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Signup failed');
  }
};
```

---

## 🔑 Sign In Flow

### **Visual Flow Diagram**

```
USER                    FRONTEND                 BACKEND                 DATABASE
  │                        │                        │                        │
  │  Enters email/password │                        │                        │
  ├───────────────────────>│                        │                        │
  │                        │                        │                        │
  │                        │  POST /api/auth/signin │                        │
  │                        │  {email, password}     │                        │
  │                        ├───────────────────────>│                        │
  │                        │                        │                        │
  │                        │                        │  1. Find user by email │
  │                        │                        ├───────────────────────>│
  │                        │                        │    findOne({email})    │
  │                        │                        │<───────────────────────┤
  │                        │                        │    User document       │
  │                        │                        │                        │
  │                        │                        │  2. Compare passwords  │
  │                        │                        │     bcrypt.compare()   │
  │                        │                        │                        │
  │                        │                        │  3. Generate JWT token │
  │                        │                        │     jwt.sign()         │
  │                        │                        │                        │
  │                        │                        │  4. Update lastLogin   │
  │                        │                        ├───────────────────────>│
  │                        │                        │    user.save()         │
  │                        │                        │<───────────────────────┤
  │                        │                        │                        │
  │                        │    200 OK              │                        │
  │                        │    {user, token}       │                        │
  │                        │    Set-Cookie: token   │                        │
  │                        │<───────────────────────┤                        │
  │                        │                        │                        │
  │                        │  1. Dispatch Redux     │                        │
  │                        │     signInSuccess      │                        │
  │                        │  2. Store token in     │                        │
  │                        │     localStorage       │                        │
  │                        │  3. Redirect to home   │                        │
  │                        │                        │                        │
  │   Logged in!           │                        │                        │
  │<───────────────────────┤                        │                        │
  │                        │                        │                        │
```

### **Backend Code**

```javascript
// controllers/auth.controller.js
export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    // ============== STEP 1: FIND USER ==============
    const validUser = await User.findOne({ email });
    
    if (!validUser) {
      return next(errorHandler(404, 'User not found'));
    }
    
    // ============== STEP 2: CHECK OAUTH USER ==============
    if (validUser.isOAuthUser) {
      return next(errorHandler(400, 'This account uses Google sign-in'));
    }
    
    // ============== STEP 3: VERIFY PASSWORD ==============
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    
    if (!validPassword) {
      return next(errorHandler(401, 'Invalid credentials'));
    }
    
    // ============== STEP 4: UPDATE LAST LOGIN ==============
    validUser.lastLogin = new Date();
    await validUser.save();
    
    // ============== STEP 5: GENERATE JWT ==============
    const token = jwt.sign(
      { id: validUser._id }, 
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // ============== STEP 6: REMOVE PASSWORD FROM RESPONSE ==============
    const { password: hashedPassword, ...rest } = validUser._doc;
    
    // ============== STEP 7: SET COOKIE ==============
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const cookieOptions = {
      httpOnly: true,           // Cannot be accessed by JavaScript
      expires: expiryDate,
      secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };
    
    // ============== STEP 8: SEND RESPONSE ==============
    res
      .cookie('access_token', token, cookieOptions)
      .status(200)
      .json({ ...rest, token });
      
  } catch (error) {
    next(error);
  }
};
```

### **Frontend Code**

```javascript
// pages/SignIn.jsx
import { useDispatch } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';

const handleSubmit = async (e) => {
  e.preventDefault();
  dispatch(signInStart());
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/signin`, {
      email: formData.email,
      password: formData.password
    }, {
      withCredentials: true  // Include cookies
    });
    
    const { token, ...userData } = response.data;
    
    // Store token
    localStorage.setItem('access_token', token);
    
    // Update Redux state
    dispatch(signInSuccess(userData));
    
    // Redirect
    navigate('/');
    
  } catch (error) {
    dispatch(signInFailure(error.response?.data?.message));
  }
};
```

---

## 🌐 Google OAuth Flow

### **Visual Flow Diagram**

```
USER              FRONTEND           FIREBASE          BACKEND          DATABASE
  │                  │                  │                 │                 │
  │  Click "Sign in  │                  │                 │                 │
  │  with Google"    │                  │                 │                 │
  ├─────────────────>│                  │                 │                 │
  │                  │                  │                 │                 │
  │                  │  Initiate OAuth  │                 │                 │
  │                  ├─────────────────>│                 │                 │
  │                  │                  │                 │                 │
  │                  │  Redirect to     │                 │                 │
  │                  │  Google Login    │                 │                 │
  │<─────────────────┴─────────────────┤                 │                 │
  │                                     │                 │                 │
  │  Select Google Account              │                 │                 │
  │  & Grant Permissions                │                 │                 │
  ├────────────────────────────────────>│                 │                 │
  │                                     │                 │                 │
  │                  ┌──────────────────┤                 │                 │
  │                  │  OAuth Token +   │                 │                 │
  │                  │  User Info       │                 │                 │
  │                  │<─────────────────┤                 │                 │
  │                  │                  │                 │                 │
  │                  │  POST /api/auth/google            │                 │
  │                  │  {name, email, photo}             │                 │
  │                  ├──────────────────────────────────>│                 │
  │                  │                  │                 │                 │
  │                  │                  │                 │  Check if user  │
  │                  │                  │                 │  exists         │
  │                  │                  │                 ├────────────────>│
  │                  │                  │                 │  findOne({email})
  │                  │                  │                 │<────────────────┤
  │                  │                  │                 │                 │
  │                  │                  │                 │  If not exists, │
  │                  │                  │                 │  create user    │
  │                  │                  │                 │  (no password)  │
  │                  │                  │                 ├────────────────>│
  │                  │                  │                 │<────────────────┤
  │                  │                  │                 │                 │
  │                  │                  │                 │  Generate JWT   │
  │                  │                  │                 │                 │
  │                  │  200 OK                           │                 │
  │                  │  {user, token}                    │                 │
  │                  │  Set-Cookie: token                │                 │
  │                  │<──────────────────────────────────┤                 │
  │                  │                  │                 │                 │
  │  Logged in!      │                  │                 │                 │
  │<─────────────────┤                  │                 │                 │
  │                  │                  │                 │                 │
```

### **Frontend Firebase Setup**

```javascript
// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ... other config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

### **Frontend OAuth Component**

```javascript
// components/OAuth.jsx
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function OAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleGoogleClick = async () => {
    try {
      // ============== STEP 1: FIREBASE OAUTH ==============
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // ============== STEP 2: SEND TO BACKEND ==============
      const response = await axios.post(`${API_URL}/api/auth/google`, {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL
      }, {
        withCredentials: true
      });
      
      // ============== STEP 3: UPDATE STATE ==============
      const { token, ...userData } = response.data;
      localStorage.setItem('access_token', token);
      dispatch(signInSuccess(userData));
      navigate('/');
      
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  };

  return (
    <button onClick={handleGoogleClick}>
      Sign in with Google
    </button>
  );
}
```

### **Backend OAuth Handler**

```javascript
// controllers/auth.controller.js
export const google = async (req, res, next) => {
  const { email, name, photo } = req.body;
  
  try {
    // ============== STEP 1: CHECK IF USER EXISTS ==============
    let user = await User.findOne({ email });
    
    if (user) {
      // ============== STEP 2A: EXISTING USER ==============
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
    } else {
      // ============== STEP 2B: NEW USER ==============
      // Generate unique username
      const username = name.split(' ').join('').toLowerCase() 
                     + Math.random().toString(36).slice(-8);
      
      // Create user without password
      user = new User({
        username,
        email,
        profilePicture: photo,
        isOAuthUser: true,  // Mark as OAuth user
        password: bcryptjs.hashSync(Math.random().toString(36), 10), // Random pwd
        lastLogin: new Date()
      });
      
      await user.save();
    }
    
    // ============== STEP 3: GENERATE JWT ==============
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    
    // ============== STEP 4: SEND RESPONSE ==============
    const { password, ...rest } = user._doc;
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    res
      .cookie('access_token', token, {
        httpOnly: true,
        expires: expiryDate,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      })
      .status(200)
      .json({ ...rest, token });
      
  } catch (error) {
    next(error);
  }
};
```

---

## 🔄 Token Refresh Flow

### **Purpose**
Refresh JWT token before expiry to maintain seamless user experience.

### **Implementation Strategy**

```javascript
// utils/tokenRefresher.js
import axios from 'axios';

export const setupTokenRefreshInterceptor = (store) => {
  // Intercept responses
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If 403 (token expired) and not already retried
      if (error.response?.status === 403 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Request new token
          const response = await axios.post('/api/auth/refresh-token', {}, {
            withCredentials: true
          });
          
          const { token } = response.data;
          
          // Update stored token
          localStorage.setItem('access_token', token);
          
          // Retry original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axios(originalRequest);
          
        } catch (refreshError) {
          // Refresh failed, sign out user
          store.dispatch(signOut());
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
};
```

### **Backend Refresh Endpoint**

```javascript
// controllers/auth.controller.js
export const refreshToken = async (req, res, next) => {
  const oldToken = req.cookies.access_token;
  
  if (!oldToken) {
    return next(errorHandler(401, 'No token provided'));
  }
  
  try {
    // Verify old token (even if expired)
    const decoded = jwt.verify(
      oldToken, 
      process.env.JWT_SECRET,
      { ignoreExpiration: true }  // Allow expired tokens
    );
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }
    
    // Generate new token
    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    
    // Send new token
    res
      .cookie('access_token', newToken, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      })
      .status(200)
      .json({ token: newToken });
      
  } catch (error) {
    next(error);
  }
};
```

---

## 👮 Authorization (RBAC)

### **Role-Based Access Control**

**Roles Hierarchy:**
```
Admin (Full Access)
  ↓
Manager (Read + Create + Update)
  ↓
Staff (Read + Limited Create)
  ↓
User (Basic Operations)
```

### **Role Permissions Matrix**

| Operation | User | Staff | Manager | Admin |
|-----------|------|-------|---------|-------|
| Browse Movies | ✅ | ✅ | ✅ | ✅ |
| Book Tickets | ✅ | ✅ | ✅ | ✅ |
| View Own Bookings | ✅ | ✅ | ✅ | ✅ |
| View All Bookings | ❌ | ❌ | ✅ | ✅ |
| Create Showtime | ❌ | ❌ | ✅ | ✅ |
| Add Movie | ❌ | ❌ | ❌ | ✅ |
| Delete Movie | ❌ | ❌ | ❌ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| Change Roles | ❌ | ❌ | ❌ | ✅ |

### **Middleware Implementation**

```javascript
// middleware/adminMiddleware.js
export const verifyManager = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has manager or admin role
    if (!['manager', 'admin'].includes(user.role)) {
      return res.status(403).json({ 
        message: 'Manager access required' 
      });
    }
    
    req.userData = user;  // Attach full user data
    next();
    
  } catch (error) {
    res.status(500).json({ message: 'Authorization check failed' });
  }
};

export const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only admin role allowed
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Admin access required' 
      });
    }
    
    req.userData = user;
    next();
    
  } catch (error) {
    res.status(500).json({ message: 'Authorization check failed' });
  }
};
```

### **Protected Route Usage**

```javascript
// routes/admin.route.js
import { verifyToken } from '../middleware/authMiddleware.js';
import { verifyManager, verifyAdmin } from '../middleware/adminMiddleware.js';

// Manager can view
router.get('/dashboard', verifyToken, verifyManager, getDashboardStats);

// Only admin can create
router.post('/movies', verifyToken, verifyAdmin, createMovie);

// Only admin can delete
router.delete('/movies/:id', verifyToken, verifyAdmin, deleteMovie);
```

---

## ⚡ Session Management

### **Session Validation on App Load**

```javascript
// App.jsx
useEffect(() => {
  const validateSession = async () => {
    if (currentUser) {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_URL}/api/auth/validate-session`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (!data.valid) {
          // Session invalid, sign out
          dispatch(signOut());
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        dispatch(signOut());
      }
    }
  };
  
  validateSession();
}, [currentUser]);
```

### **Backend Session Validation**

```javascript
// controllers/auth.controller.js
export const validateSession = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1] || req.cookies.access_token;
    
    if (!token) {
      return res.status(200).json({ valid: false });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(200).json({ valid: false });
    }
    
    res.status(200).json({ 
      valid: true, 
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(200).json({ valid: false });
  }
};
```

---

## 🛡️ Security Measures

### **1. Password Hashing**
```javascript
// Uses bcrypt with 10 salt rounds
const hashedPassword = bcryptjs.hashSync(password, 10);

// Verification
const isValid = bcryptjs.compareSync(plainPassword, hashedPassword);
```

**Why 10 rounds?**
- Balance between security and performance
- 2^10 = 1024 iterations
- ~100-200ms on modern hardware

### **2. HttpOnly Cookies**
```javascript
res.cookie('access_token', token, {
  httpOnly: true,  // Prevents XSS attacks
  secure: true,    // HTTPS only
  sameSite: 'none' // Prevents CSRF attacks
});
```

### **3. CORS Configuration**
```javascript
app.use(cors({
  origin: ['https://www.cinexp.app', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

### **4. Input Validation**
```javascript
// Using express-validator
import { body, validationResult } from 'express-validator';

router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('username').trim().isLength({ min: 3 })
], signup);
```

### **5. Rate Limiting** (Not implemented but recommended)
```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts'
});

app.use('/api/auth/signin', authLimiter);
```

---

## 🎓 Interview Q&A

### **Q1: Why JWT instead of session-based auth?**

**Answer**: "I chose JWT for several reasons:
1. **Stateless**: Scales horizontally without shared session store
2. **Decoupled**: Frontend and backend can be deployed independently
3. **Cross-domain**: Works well with CORS for our Vercel + Render setup
4. **Mobile-friendly**: Token can be easily stored in mobile apps
5. **Microservices-ready**: Token can be validated by multiple services

The main trade-off is that JWTs can't be easily revoked before expiry, but we mitigate this with short expiration times and session validation on critical operations."

### **Q2: How do you prevent XSS attacks?**

**Answer**: "Multiple layers:
1. **HttpOnly cookies**: Token can't be accessed by JavaScript
2. **CSP headers**: Using Helmet middleware for security headers
3. **Input sanitization**: Validating and escaping user inputs
4. **React's built-in XSS protection**: JSX automatically escapes content
5. **No innerHTML usage**: Using safe React patterns only"

### **Q3: How does OAuth flow work in your app?**

**Answer**: "We use Firebase Authentication for OAuth:
1. User clicks 'Sign in with Google'
2. Firebase SDK redirects to Google's auth page
3. User grants permissions
4. Firebase returns OAuth token and user info
5. Frontend sends this info to our backend
6. Backend checks if user exists, creates if not
7. Backend generates our own JWT token
8. User is authenticated in our system

This way, we leverage Google's secure OAuth but maintain our own user management."

### **Q4: What's your strategy for token refresh?**

**Answer**: "I implemented automatic token refresh:
1. Axios interceptor catches 403 responses
2. Attempts to refresh token via `/refresh-token` endpoint
3. If successful, retries original request with new token
4. If refresh fails, signs user out
5. 7-day token expiry balances security and UX

For critical operations like payments, we also validate session on backend even with valid token."

### **Q5: How do you implement role-based access control?**

**Answer**: "I use middleware chaining:
1. `verifyToken` middleware extracts and validates JWT
2. `verifyManager` or `verifyAdmin` middleware checks user role from database
3. Routes are protected with appropriate middleware combination
4. User model has `role` field with enum: user, staff, manager, admin
5. Frontend also checks role to hide/show UI elements, but security is enforced on backend"

---

**Next:** [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
