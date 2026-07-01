# 📁 FOLDER STRUCTURE EXPLAINED

## 📋 Table of Contents
1. [Root Directory Overview](#root-directory-overview)
2. [Backend Structure (api/)](#backend-structure-api)
3. [Frontend Structure (client/)](#frontend-structure-client)
4. [Configuration Files](#configuration-files)
5. [File Naming Conventions](#file-naming-conventions)
6. [Module Organization](#module-organization)

---

## 🏠 Root Directory Overview

```
CinimaticPopcornPark/
├── mern-auth/                          # Main project root
│   ├── api/                            # Backend (Node.js + Express)
│   ├── client/                         # Frontend (React + Vite)
│   ├── docs/                           # Documentation (this file!)
│   ├── package.json                    # Root dependencies & scripts
│   ├── start-app.bat                   # Windows start script
│   ├── vercel.json                     # Deployment config
│   ├── tailwind.config.js              # Tailwind CSS config
│   └── mern-auth-firebase-adminsdk.json # Firebase service account
└── README.md                           # Project documentation
```

### **Why this structure?**
- **Monorepo approach**: Both frontend and backend in one repository
- **Separation**: Clear boundary between client and server code
- **Scalability**: Easy to split into separate repos if needed
- **Development**: Can run both services from root or independently

---

## 🔧 Backend Structure (api/)

### **Complete Backend Tree**

```
api/
├── index.js                       # ⭐ Main server entry point
├── scripts.json                   # Helper scripts
│
├── config/                        # Configuration files
│   └── cloudinary.js              # Cloudinary image upload setup
│
├── controllers/                   # ⭐ Business logic layer
│   ├── admin.controller.js        # Admin dashboard & management
│   ├── auth.controller.js         # Authentication (signin, signup, OAuth)
│   ├── bookingController.js       # Booking creation & management
│   ├── confirmPayment.controller.js # Payment confirmation
│   ├── emergencyShowtime.controller.js # Emergency showtime fixes
│   ├── movie.controller.js        # Movie CRUD operations
│   ├── parking.controller.js      # Parking slot management
│   ├── seat.controller.js         # Seat selection & hold logic
│   ├── seatGenerator.controller.js # Bulk seat generation
│   ├── showtime.controller.js     # Showtime management & cron jobs
│   ├── showtimeFix.controller.js  # Showtime repair utilities
│   ├── stripe.controller.js       # Stripe payment processing
│   ├── user.controller.js         # User profile management
│   └── validateAuth.controller.js # Auth validation endpoints
│
├── middleware/                    # ⭐ Request interceptors
│   ├── adminMiddleware.js         # Admin/Manager role verification
│   └── authMiddleware.js          # JWT token verification
│
├── models/                        # ⭐ Database schemas (Mongoose)
│   ├── booking.js                 # Booking schema
│   ├── confirmPayment.js          # Payment confirmation schema
│   ├── contactMessage.js          # Contact form schema
│   ├── FAQQuestion.js             # FAQ schema
│   ├── movie.model.js             # Movie schema
│   ├── parking.model.js           # Parking lot schema
│   ├── parkingSlot.model.js       # Individual parking slot schema
│   ├── seat.model.js              # Seat schema
│   ├── showtime.model.js          # Showtime schema
│   └── user.model.js              # User schema
│
├── routes/                        # ⭐ API endpoints definition
│   ├── admin.route.js             # /api/admin/* routes
│   ├── auth.route.js              # /api/auth/* routes
│   ├── bookingRoutes.js           # /api/bookings routes
│   ├── confirmPaymentRoutes.js    # Payment confirmation routes
│   ├── contact.js                 # Contact form routes
│   ├── faq.js                     # FAQ routes
│   ├── movie.route.js             # /api/movies routes
│   ├── parking.route.js           # /api/parking routes
│   ├── seat.route.js              # /api/seats routes
│   ├── seatGenerator.route.js     # Seat generation utility routes
│   ├── showtime.route.js          # /api/showtimes routes
│   ├── stripe.route.js            # /api/stripe routes
│   └── user.route.js              # /api/user routes
│
└── utils/                         # ⭐ Helper functions
    ├── createAdmin.js             # Admin user creation script
    ├── emailService.js            # Nodemailer email sender
    ├── error.js                   # Custom error handler
    ├── updateAdminRole.js         # Role update utilities
    └── verifyUser.js              # User verification helpers
```

### **Detailed Explanation of Key Directories**

#### **1. index.js - The Heart of Backend**

```javascript
// What happens in index.js:
1. Import dependencies (Express, Mongoose, Socket.IO, etc.)
2. Initialize Express app
3. Set up CORS configuration
4. Apply middleware (body-parser, cookie-parser, helmet)
5. Connect to MongoDB
6. Register all routes
7. Set up Socket.IO server
8. Schedule cron jobs (seat release, showtime generation)
9. Error handling middleware
10. Start HTTP server on port 5000
```

**Key Code Structure:**
```javascript
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';

// Import all routes
import authRoutes from './routes/auth.route.js';
import movieRoutes from './routes/movie.route.js';
// ... more routes

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: {...} });

// Middleware
app.use(cors({...}));
app.use(express.json());
app.use(cookieParser());

// Database connection
mongoose.connect(process.env.MONGO);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
// ... more routes

// Socket.IO
io.on('connection', (socket) => {
  // Real-time event handlers
});

// Cron jobs
cron.schedule('* * * * *', async () => {
  // Release expired holds every minute
});

cron.schedule('0 0 * * *', async () => {
  // Generate next day showtimes at midnight
});

// Start server
httpServer.listen(5000);
```

#### **2. controllers/ - Business Logic**

**Purpose**: Handle application business logic, orchestrate operations

**Pattern**: Each controller handles one resource domain

**Example: bookingController.js**
```javascript
// Responsibilities:
- Validate booking request
- Check showtime availability
- Verify seat holds
- Start MongoDB transaction
- Update seat status
- Create booking record
- Process payment
- Send confirmation email
- Emit Socket.IO event
- Return response
```

**Controller Structure:**
```javascript
export const createBooking = async (req, res) => {
  // 1. Input validation
  // 2. Business logic
  // 3. Database operations
  // 4. External service calls
  // 5. Response formation
};

export const getBookings = async (req, res) => {...};
export const updateBooking = async (req, res) => {...};
export const deleteBooking = async (req, res) => {...};
```

#### **3. middleware/ - Request Interceptors**

**Purpose**: Process requests before they reach controllers

**authMiddleware.js:**
```javascript
// JWT Token Verification
export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({...});
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({...});
    req.user = user;
    next();
  });
};
```

**adminMiddleware.js:**
```javascript
// Role-based access control
export const verifyManager = async (req, res, next) => {
  if (!['manager', 'admin'].includes(req.userData.role)) {
    return res.status(403).json({ message: 'Manager access required' });
  }
  next();
};

export const verifyAdmin = async (req, res, next) => {
  if (req.userData.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
```

#### **4. models/ - Database Schemas**

**Purpose**: Define data structure and validation rules

**Example: booking.js**
```javascript
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  movieId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Movie', 
    required: true 
  },
  showtimeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  seats: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Seat' 
  }],
  totalCost: { 
    type: Number, 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'FAILED'], 
    default: 'PENDING' 
  },
  bookingReference: {
    type: String,
    default: function() {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
```

**Key Model Features:**
- Schema validation
- Default values
- Relationships (refs)
- Timestamps (createdAt, updatedAt)
- Indexes for query optimization
- Virtual fields
- Custom methods

#### **5. routes/ - API Endpoints**

**Purpose**: Define URL patterns and map to controllers

**Example: auth.route.js**
```javascript
import express from 'express';
import { 
  signin, 
  signup, 
  google, 
  signout 
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/google', google);
router.get('/signout', signout);

export default router;
```

**Route Structure Pattern:**
```
Route File → Define Express Router → Import Controllers → Map HTTP verbs to functions → Export router
```

#### **6. utils/ - Helper Functions**

**Purpose**: Reusable utility functions

**emailService.js:**
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({...});

export const sendBookingEmail = async (userEmail, bookingDetails) => {
  await transporter.sendMail({
    from: 'cinema@cinexp.app',
    to: userEmail,
    subject: 'Booking Confirmation',
    html: generateEmailTemplate(bookingDetails)
  });
};
```

**error.js:**
```javascript
export const errorHandler = (statusCode, message) => {
  const error = new Error();
  error.statusCode = statusCode;
  error.message = message;
  return error;
};
```

---

## 💻 Frontend Structure (client/)

### **Complete Frontend Tree**

```
client/
├── index.html                     # HTML entry point
├── package.json                   # Frontend dependencies
├── vite.config.js                 # Vite build configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.cjs             # PostCSS configuration
├── eslint.config.js               # ESLint rules
├── vercel.json                    # Vercel deployment config
│
├── public/                        # Static assets
│   ├── mov.jpg                    # Images
│   └── favicon.ico                # Favicon
│
└── src/                           # ⭐ Source code
    ├── main.jsx                   # ⭐ React entry point
    ├── App.jsx                    # ⭐ Root component (routing)
    ├── index.css                  # Global styles
    ├── cinematic-luxury.css       # Custom theme styles
    ├── firebase.js                # Firebase configuration
    ├── socket.js                  # Socket.IO client setup
    │
    ├── components/                # ⭐ Reusable components
    │   ├── Header.jsx             # Navigation bar
    │   ├── Footer.jsx             # Footer component
    │   ├── PrivateRoute.jsx       # Protected route wrapper
    │   ├── AdminPrivateRoute.jsx  # Admin route wrapper
    │   ├── AdminLayout.jsx        # Admin dashboard layout
    │   ├── OAuth.jsx              # Google sign-in button
    │   ├── PhoneOTPVerification.jsx # Phone verification
    │   ├── MovieImage.jsx         # Lazy-loaded movie image
    │   ├── LoadingAndErrorHandler.jsx # Loading/error states
    │   ├── TicketsStateHandling.jsx # Ticket state management
    │   ├── SystemUpdateBanner.jsx # Maintenance banner
    │   └── AdminAuthDebugger.jsx  # Admin auth debugger
    │
    ├── pages/                     # ⭐ Page components (routes)
    │   ├── Home.jsx               # Homepage
    │   ├── About.jsx              # About page
    │   ├── SignIn.jsx             # Login page
    │   ├── SignUp.jsx             # Registration page
    │   ├── Profile.jsx            # User profile
    │   ├── MovieDetails.jsx       # Movie detail page
    │   ├── Tickets-new.jsx        # Seat selection page
    │   ├── payment-new.jsx        # Payment page
    │   ├── StripePayment.jsx      # Stripe checkout
    │   ├── PaymentMethodSelection.jsx # Payment method choice
    │   ├── Contact.jsx            # Contact form
    │   ├── Faq.jsx                # FAQ page
    │   ├── Pricing.jsx            # Pricing page
    │   ├── PrivacyPolicy.jsx      # Privacy policy
    │   ├── TermsConditions.jsx    # Terms & conditions
    │   ├── CancellationRefund.jsx # Refund policy
    │   ├── DebugPage.jsx          # Debug utilities
    │   │
    │   └── admin/                 # Admin pages
    │       ├── AdminDashboard.jsx # Admin home
    │       ├── UserManagement.jsx # User CRUD
    │       ├── MovieManagement.jsx # Movie CRUD
    │       ├── BookingManagement.jsx # Booking oversight
    │       ├── ShowtimesManagement.jsx # Showtime CRUD
    │       ├── MovieShowtimeManagement.jsx # Movie-showtime link
    │       └── Reports.jsx        # Analytics & reports
    │
    ├── redux/                     # ⭐ State management
    │   ├── store.js               # Redux store configuration
    │   └── user/                  # User slice
    │       └── userSlice.js       # User state & actions
    │
    ├── services/                  # ⭐ API service layer
    │   └── socketService.js       # Socket.IO connection
    │
    ├── utils/                     # ⭐ Utility functions
    │   └── tokenRefresher.js      # JWT refresh logic
    │
    ├── styles/                    # Additional stylesheets
    │   └── (custom CSS files)
    │
    └── images/                    # Local images
        └── (image assets)
```

### **Detailed Explanation of Key Frontend Files**

#### **1. main.jsx - React Entry Point**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { store, persistor } from './redux/store.js';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
```

**What happens:**
1. Import React and ReactDOM
2. Import root App component
3. Import Redux store and persistor
4. Wrap App with Redux Provider
5. Wrap with PersistGate for state persistence
6. Render to DOM element with id 'root'

#### **2. App.jsx - Route Definition**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import PrivateRoute from './components/PrivateRoute';
// ... more imports

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        
        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/tickets" element={<TicketsNew />} />
          <Route path="/payment" element={<PaymentNew />} />
        </Route>
        
        {/* Admin routes */}
        <Route element={<AdminPrivateRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="movies" element={<MovieManagement />} />
          </Route>
        </Route>
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
```

**Routing Strategy:**
- Public routes: Accessible to all
- PrivateRoute: Requires authentication
- AdminPrivateRoute: Requires admin/manager role
- Nested routes for admin panel

#### **3. redux/store.js - State Management**

```javascript
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import userReducer from './user/userSlice.js';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({ 
  user: userReducer 
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
```

**Purpose:**
- Configure Redux store
- Apply redux-persist for localStorage persistence
- Combine multiple reducers (future scalability)
- Export store and persistor

#### **4. redux/user/userSlice.js - User State**

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentUser: null,
  loading: false,
  error: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    signInStart: (state) => {
      state.loading = true;
    },
    signInSuccess: (state, action) => {
      state.currentUser = action.payload;
      state.loading = false;
      state.error = false;
    },
    signInFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    signOut: (state) => {
      state.currentUser = null;
      state.loading = false;
      state.error = false;
    },
  },
});

export const { 
  signInStart, 
  signInSuccess, 
  signInFailure, 
  signOut 
} = userSlice.actions;

export default userSlice.reducer;
```

**Actions:**
- signInStart: Set loading state
- signInSuccess: Save user data
- signInFailure: Set error message
- signOut: Clear user data

#### **5. components/ - Reusable Components**

**PrivateRoute.jsx:**
```jsx
import { useSelector } from 'react-redux';
import { Outlet, Navigate } from 'react-router-dom';

export default function PrivateRoute() {
  const { currentUser } = useSelector(state => state.user);
  return currentUser ? <Outlet /> : <Navigate to='/signin' />;
}
```

**Purpose:**
- Protect routes requiring authentication
- Redirect unauthenticated users to sign-in
- Use React Router's Outlet for nested routes

#### **6. services/socketService.js - WebSocket Client**

```javascript
import io from 'socket.io-client';

let socket = null;

export const connectSocket = () => {
  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    withCredentials: true
  });
  
  socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
  });
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
};

export const getSocket = () => socket;
```

---

## ⚙️ Configuration Files

### **Backend Configuration**

#### **package.json (root/backend)**
```json
{
  "name": "mern-auth",
  "version": "1.0.0",
  "type": "module",  // ← ES6 modules enabled
  "scripts": {
    "start": "node api/index.js",
    "dev": "nodemon api/index.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "mongoose": "^8.15.0",
    "jsonwebtoken": "^9.0.2",
    // ... more
  }
}
```

#### **.env (not in repo)**
```env
MONGO=mongodb+srv://...
JWT_SECRET=your_secret_key
PORT=5000
STRIPE_SECRET_KEY=sk_...
CLOUDINARY_CLOUD_NAME=...
EMAIL_USER=...
EMAIL_PASS=...
```

### **Frontend Configuration**

#### **vite.config.js**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

**Purpose:**
- Configure Vite build tool
- Use SWC for faster React compilation
- Proxy API calls in development

#### **tailwind.config.js**
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cinema-gold': '#FFD700',
        'cinema-dark': '#1a1a1a',
      },
    },
  },
  plugins: [],
}
```

---

## 📝 File Naming Conventions

### **Backend**
- **Models**: `lowercase.model.js` (e.g., `user.model.js`)
- **Controllers**: `lowercase.controller.js` (e.g., `auth.controller.js`)
- **Routes**: `lowercase.route.js` or `lowercaseRoutes.js`
- **Middleware**: `lowercaseMiddleware.js`
- **Utils**: `camelCase.js`

### **Frontend**
- **Components**: `PascalCase.jsx` (e.g., `Header.jsx`)
- **Pages**: `PascalCase.jsx` (e.g., `Home.jsx`)
- **Utils**: `camelCase.js`
- **Styles**: `kebab-case.css`
- **Config**: `lowercase.config.js`

### **Why this matters in interviews:**
"I followed consistent naming conventions: models use `.model.js` suffix, controllers use `.controller.js`, and React components use PascalCase. This makes the codebase self-documenting and helps new developers onboard quickly."

---

## 🎯 Module Organization Patterns

### **Feature-Based vs. Type-Based**

**Current Structure (Type-Based):**
```
✅ api/
    ├── controllers/  ← All controllers together
    ├── models/       ← All models together
    ├── routes/       ← All routes together
```

**Alternative (Feature-Based):**
```
❌ api/
    ├── booking/
    │   ├── booking.controller.js
    │   ├── booking.model.js
    │   └── booking.route.js
    ├── movie/
    │   ├── movie.controller.js
    │   └── movie.model.js
```

**Why Type-Based was chosen:**
- Smaller project size
- Clear separation by responsibility
- Easier to locate files by type
- Standard MVC pattern
- Better for learning/interviews

**When Feature-Based is better:**
- Large-scale applications
- Microservices architecture
- Independent feature teams
- Feature-specific testing

---

## 🎓 Interview Talking Points

### **"Explain your folder structure"**

**Answer:**
"I organized the project as a monorepo with clear separation between frontend and backend. The backend follows MVC pattern with controllers handling business logic, models defining schemas, and routes mapping URLs. The frontend uses React with a component-based structure where reusable components are separated from pages. I also have a services layer for API calls and Redux for state management. This structure provides clear separation of concerns and makes the codebase maintainable."

### **"Why didn't you use feature-based structure?"**

**Answer:**
"For this project size, type-based organization (MVC) is more appropriate. It's easier to navigate - if I need to check authentication logic, I go to auth.controller.js. If I need the user schema, I go to user.model.js. For larger projects or microservices, I would consider feature-based organization where each feature is self-contained."

---

**Next:** [FRONTEND_DETAILED.md](./FRONTEND_DETAILED.md)
