# 🎯 INTERVIEW PREPARATION GUIDE

## 📋 Table of Contents
1. [Quick Project Pitches](#quick-project-pitches)
2. [30 Technical Questions](#30-technical-questions)
3. [20 Deep Follow-up Questions](#20-deep-follow-up-questions)
4. [10 System Design Questions](#10-system-design-questions)
5. [Behavioral Questions](#behavioral-questions)
6. [Code Walkthroughs](#code-walkthroughs)
7. [Architecture Explanations](#architecture-explanations)
8. [Trade-offs & Decisions](#trade-offs--decisions)

---

## 🎤 Quick Project Pitches

### **30-Second Pitch**

"I built a full-stack cinema booking platform using the MERN stack. Users can browse movies, select seats in real-time with WebSocket updates, and complete payments through Stripe. It features JWT authentication with Google OAuth, role-based access control for admin management, and automated seat release using cron jobs. The frontend is deployed on Vercel, backend on Render, and uses MongoDB Atlas for the database."

### **2-Minute Pitch**

"I developed CinematicPopcornPark, a comprehensive movie ticket booking system handling the entire user journey from browsing to payment.

On the **backend**, I used Express.js with a layered MVC architecture. The API has 50+ endpoints managing users, movies, showtimes, seats, bookings, and parking. I implemented JWT-based authentication with bcrypt password hashing and role-based authorization supporting four user levels: user, staff, manager, and admin.

The most challenging feature was **real-time seat synchronization**. I used Socket.IO to broadcast seat status changes to all users viewing the same showtime. When someone selects a seat, it's held for 10 minutes with automatic release via a cron job, preventing double bookings.

On the **frontend**, I built a responsive React interface with Redux for state management. The booking flow includes seat selection with visual feedback, parking slot allocation, and Stripe payment integration. I also implemented Google OAuth for seamless social login.

For **data management**, I used MongoDB with Mongoose ODM, designing normalized schemas with proper relationships. I implemented compound indexes to prevent overlapping showtimes and ensure data integrity.

The application is production-ready with automated showtime generation, email notifications via Nodemailer, image storage on Cloudinary, and comprehensive error handling. It's deployed on Vercel and Render with HTTPS, security headers, and proper CORS configuration."

### **5-Minute Deep Dive**

*(Expand on any section based on interviewer interest - see detailed answers below)*

---

## ❓ 30 Technical Questions

### **General Architecture**

#### **Q1: Walk me through the architecture of your application.**

**Answer:**
"The application follows a three-tier architecture:

**Presentation Layer (Frontend):**
- React 18 with Vite for fast builds
- Redux Toolkit for centralized state management
- React Router for client-side routing
- Tailwind CSS for styling

**Application Layer (Backend):**
- Express.js server handling business logic
- MVC pattern with controllers, models, and routes
- JWT-based authentication middleware
- Socket.IO server for real-time updates
- Cron jobs for scheduled tasks

**Data Layer:**
- MongoDB Atlas database
- Mongoose ODM for schema validation
- Aggregation pipelines for complex queries

Communication happens over REST APIs for standard operations and WebSocket for real-time seat updates. The frontend makes authenticated requests with JWT tokens, and the backend validates them before processing."

---

#### **Q2: Explain your database schema design.**

**Answer:**
"I have 10 main collections:

**Users**: Stores authentication data (email, password hash, role) and profile information. The role field uses an enum for RBAC.

**Movies**: Contains movie metadata (title, genre, duration, poster, cast, crew). Has a text index on title and genre for search.

**Showtimes**: Links movies to screens with start/end times. Has compound indexes on (screen, startTime, endTime) to prevent overlapping shows.

**Seats**: Individual seat documents referenced to showtimes. Has compound unique index on (showtimeId, seatNumber). Stores status (AVAILABLE/HELD/SOLD) and holdUntil timestamp.

**Bookings**: Central entity connecting users, movies, showtimes, seats, and parking. Stores arrays of seatIds and parkingSlotIds, payment status, and booking reference.

**ParkingSlots**: Similar to seats, linked to showtimes with vehicle type and status.

The relationships are mostly one-to-many with document references. I chose this over embedding because seats and showtimes are frequently updated independently. For booking summaries, I use Mongoose populate() to get related data."

---

#### **Q3: How does authentication work in your application?**

**Answer:**
"I implemented stateless JWT authentication:

**Registration Flow:**
1. User submits credentials
2. Backend validates (checks if email exists)
3. Password is hashed with bcrypt (10 salt rounds)
4. User document created in MongoDB
5. JWT token generated with user ID as payload
6. Token sent in HttpOnly cookie (XSS protection)
7. Frontend stores user data in Redux (not the token)

**Login Flow:**
1. User enters credentials
2. Backend finds user by email
3. Password compared with bcrypt.compareSync()
4. If valid, generate new JWT with 7-day expiry
5. Send token in HttpOnly cookie
6. Frontend receives user data and updates Redux

**Protected Routes:**
1. Frontend includes token automatically (via cookies)
2. Backend middleware extracts token from Authorization header or cookie
3. jwt.verify() validates signature and expiry
4. Decoded payload attached to req.user
5. Controller accesses req.user.id for database queries

**Google OAuth:**
Uses Firebase Authentication for social login, then creates/finds user in our database and issues our own JWT token for consistent authorization."

---

### **Real-Time Features**

#### **Q4: Explain how real-time seat updates work.**

**Answer:**
"I used Socket.IO for bidirectional communication:

**Client-Side:**
```javascript
// Connect to server
const socket = io(serverURL);

// Join room for specific showtime
socket.emit('joinShowtime', showtimeId);

// Listen for seat updates
socket.on('seatsUpdated', (updatedSeats) => {
  // Update local state
  setSeats(prevSeats => 
    prevSeats.map(seat => 
      updatedSeats.find(u => u._id === seat._id) || seat
    )
  );
});
```

**Server-Side:**
```javascript
io.on('connection', (socket) => {
  socket.on('joinShowtime', (showtimeId) => {
    socket.join(`showtime-${showtimeId}`);
  });
  
  // When seat status changes
  const updatedSeats = await Seat.updateMany(...);
  io.to(`showtime-${showtimeId}`).emit('seatsUpdated', updatedSeats);
});
```

**Flow:**
1. User opens seat selection page
2. Socket connects and joins showtime-specific room
3. User clicks a seat
4. Frontend emits 'holdSeat' event
5. Backend validates and updates database
6. Backend emits 'seatsUpdated' to entire room
7. All clients in that room update their UI instantly

This prevents race conditions where two users try to book the same seat."

---

#### **Q5: How do you prevent double booking?**

**Answer:**
"Multiple layers of protection:

**1. Database Constraints:**
```javascript
seatSchema.index({ showtimeId: 1, seatNumber: 1 }, { unique: true });
```
One seat document per showtime. Can't create duplicates.

**2. Status Field:**
```javascript
{
  status: { type: String, enum: ['AVAILABLE', 'HELD', 'SOLD'] }
}
```
Only AVAILABLE seats can be selected.

**3. Atomic Updates:**
```javascript
const seat = await Seat.findOneAndUpdate(
  { _id: seatId, status: 'AVAILABLE' },  // Only if available
  { status: 'HELD', userId, holdUntil: Date.now() + 600000 },
  { new: true }
);

if (!seat) {
  return res.status(409).json({ message: 'Seat already taken' });
}
```
Uses MongoDB's atomic operations. If two requests arrive simultaneously, only one succeeds.

**4. Transaction for Final Booking:**
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Check seats still held by this user
  const seats = await Seat.find({
    _id: { $in: seatIds },
    userId: req.user.id,
    status: 'HELD'
  }).session(session);
  
  if (seats.length !== seatIds.length) {
    throw new Error('Some seats are no longer available');
  }
  
  // Update seats to SOLD
  await Seat.updateMany(
    { _id: { $in: seatIds } },
    { status: 'SOLD' },
    { session }
  );
  
  // Create booking
  await Booking.create([bookingData], { session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

**5. Hold Timeout:**
Seats automatically released after 10 minutes via cron job, freeing inventory if user abandons booking."

---

### **State Management**

#### **Q6: Why did you choose Redux Toolkit over Context API?**

**Answer:**
"I chose Redux Toolkit for several reasons:

**1. Better DevTools:**
Redux DevTools shows action history, time-travel debugging, and state diffs. Essential for debugging complex state changes.

**2. Performance:**
Context API causes re-renders of all consuming components when any part of the context changes. Redux with `useSelector` only re-renders components when their specific slice changes.

**3. Middleware Support:**
Redux middleware like `redux-persist` for localStorage persistence and potential for `redux-thunk` or `redux-saga` for complex async logic.

**4. Structured Pattern:**
Redux enforces a clear pattern: actions, reducers, selectors. With a large team, this structure is more maintainable than Context.

**5. Redux Toolkit Simplification:**
Redux Toolkit eliminates boilerplate. `createSlice` combines actions and reducers:
```javascript
const userSlice = createSlice({
  name: 'user',
  initialState: { currentUser: null, loading: false, error: null },
  reducers: {
    signInStart: (state) => { state.loading = true; },
    signInSuccess: (state, action) => { 
      state.currentUser = action.payload;
      state.loading = false;
    }
  }
});
```

Context API is good for small apps or theme switching, but Redux scales better for complex applications with multiple state domains."

---

#### **Q7: How do you handle loading and error states?**

**Answer:**
"I use a consistent pattern across Redux slices:

**State Shape:**
```javascript
{
  data: null,
  loading: false,
  error: null
}
```

**Actions:**
```javascript
signInStart: (state) => {
  state.loading = true;
  state.error = null;
},
signInSuccess: (state, action) => {
  state.currentUser = action.payload;
  state.loading = false;
  state.error = null;
},
signInFailure: (state, action) => {
  state.loading = false;
  state.error = action.payload;
}
```

**Components:**
```javascript
const { currentUser, loading, error } = useSelector(state => state.user);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
if (!currentUser) return <LoginPrompt />;
return <Dashboard user={currentUser} />;
```

**API Calls:**
```javascript
const handleSignIn = async (credentials) => {
  dispatch(signInStart());
  try {
    const response = await axios.post('/api/auth/signin', credentials);
    dispatch(signInSuccess(response.data));
    navigate('/dashboard');
  } catch (error) {
    dispatch(signInFailure(error.response?.data?.message || 'Login failed'));
  }
};
```

I also have a custom `LoadingAndErrorHandler` component that wraps async operations and displays appropriate UI states."

---

### **Backend Architecture**

#### **Q8: Explain your middleware chain in Express.**

**Answer:**
"The middleware executes in order:

**1. CORS (First - handles preflight):**
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'https://www.cinexp.app'],
  credentials: true
}));
```

**2. Helmet (Security Headers):**
```javascript
app.use(helmet());
```
Adds X-Content-Type-Options, X-Frame-Options, etc.

**3. Body Parsers:**
```javascript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

**4. Cookie Parser:**
```javascript
app.use(cookieParser());
```

**5. Logging (Development):**
```javascript
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
```

**6. Routes:**
```javascript
app.use('/api/auth', authRouter);
app.use('/api/movies', movieRouter);
// ... more routes
```

**7. Error Handler (Last):**
```javascript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ 
    success: false, 
    message,
    statusCode
  });
});
```

**Route-Specific Middleware:**
```javascript
router.delete('/movies/:id',
  verifyToken,          // Checks JWT
  verifyAdmin,          // Checks role
  deleteMovie           // Controller
);
```

Order matters! CORS must be first, error handler must be last."

---

#### **Q9: How do you handle errors in your application?**

**Answer:**
"I use a custom error handler:

**Custom Error Class:**
```javascript
export const errorHandler = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};
```

**Usage in Controllers:**
```javascript
export const getMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return next(errorHandler(404, 'Movie not found'));
    }
    res.json(movie);
  } catch (error) {
    next(error);  // Pass to error handler middleware
  }
};
```

**Global Error Handler:**
```javascript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  console.error({
    timestamp: new Date().toISOString(),
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

**Frontend Error Handling:**
```javascript
try {
  const response = await axios.post(url, data);
} catch (error) {
  if (error.response) {
    // Server responded with error
    Swal.fire('Error', error.response.data.message, 'error');
  } else if (error.request) {
    // Request made but no response
    Swal.fire('Network Error', 'Server is not responding', 'error');
  } else {
    // Something else went wrong
    Swal.fire('Error', error.message, 'error');
  }
}
```

This gives consistent error handling across the application."

---

#### **Q10: Explain your use of cron jobs.**

**Answer:**
"I use node-cron for scheduled background tasks:

**1. Seat Hold Release (Every Minute):**
```javascript
cron.schedule('* * * * *', async () => {
  const expiredSeats = await Seat.updateMany(
    {
      status: 'HELD',
      holdUntil: { $lt: new Date() }
    },
    {
      status: 'AVAILABLE',
      $unset: { userId: 1, holdUntil: 1 }
    }
  );
  
  if (expiredSeats.modifiedCount > 0) {
    console.log(`Released ${expiredSeats.modifiedCount} expired seats`);
    // Emit Socket.IO update
    io.emit('seatsUpdated', { showtime: 'all' });
  }
});
```

**2. Parking Slot Release (Every Minute):**
Same logic for parking slots.

**3. Showtime Generation (Daily at Midnight):**
```javascript
cron.schedule('0 0 * * *', async () => {
  const movies = await Movie.find({ status: { $in: ['Released', 'Upcoming'] } });
  const screens = ['Screen 1', 'Screen 2', 'Screen 3', 'Screen 4'];
  const showtimesPerDay = 4;
  
  for (let day = 0; day < 7; day++) {
    for (const screen of screens) {
      for (let i = 0; i < showtimesPerDay; i++) {
        const movie = movies[Math.floor(Math.random() * movies.length)];
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + day);
        startTime.setHours(10 + (i * 3), 0, 0, 0);
        
        const endTime = new Date(startTime.getTime() + movie.duration * 60000);
        
        // Check for overlaps
        const conflict = await Showtime.findOne({
          screen,
          $or: [
            { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
          ]
        });
        
        if (!conflict) {
          await Showtime.create({ movieId: movie._id, screen, startTime, endTime });
        }
      }
    }
  }
  
  console.log('Generated showtimes for next 7 days');
});
```

**4. Archive Old Showtimes (Daily):**
```javascript
cron.schedule('0 1 * * *', async () => {
  await Showtime.updateMany(
    { endTime: { $lt: new Date() }, isArchived: false },
    { isArchived: true }
  );
});
```

Cron jobs prevent manual intervention and ensure the system maintains itself."

---

### **Security**

#### **Q11: How do you secure passwords?**

**Answer:**
"Multi-layer password security:

**1. Hashing with bcrypt:**
```javascript
import bcryptjs from 'bcryptjs';

// Signup
const hashedPassword = bcryptjs.hashSync(password, 10);
await User.create({ email, password: hashedPassword });
```
bcrypt is specifically designed for passwords. The salt (10 rounds = 2^10 iterations) makes  rainbow table attacks infeasible.

**2. Comparison:**
```javascript
// Login
const validPassword = bcryptjs.compareSync(password, user.password);
```
Constant-time comparison prevents timing attacks.

**3. Never expose password:**
```javascript
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};
```

**4. Password validation (should add):**
```javascript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(password)) {
  return res.status(400).json({ 
    message: 'Password must be 8+ characters with uppercase, lowercase, number, and special char' 
  });
}
```

**5. Rate limiting login attempts (should add):**
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});
app.use('/api/auth/signin', loginLimiter);
```

**OAuth Users:**
No password stored. Google handles authentication, we just link the Google ID."

---

#### **Q12: How do you implement role-based access control?**

**Answer:**
"Four-tier RBAC system:

**1. Role Definition (User Model):**
```javascript
role: {
  type: String,
  enum: ['user', 'staff', 'manager', 'admin'],
  default: 'user'
}
```

**2. Authentication Middleware:**
```javascript
export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1] || req.cookies.access_token;
  
  if (!token) {
    return next(errorHandler(401, 'Unauthorized'));
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(errorHandler(403, 'Invalid token'));
    req.user = decoded;  // { id: userId }
    next();
  });
};
```

**3. Authorization Middleware:**
```javascript
export const verifyAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== 'admin') {
    return next(errorHandler(403, 'Admin access required'));
  }
  req.userData = user;
  next();
};

export const verifyManager = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!['manager', 'admin'].includes(user.role)) {
    return next(errorHandler(403, 'Manager access required'));
  }
  req.userData = user;
  next();
};
```

**4. Route Protection:**
```javascript
// Public
router.get('/movies', getMovies);

// User only
router.post('/bookings', verifyToken, createBooking);

// Manager or Admin
router.get('/bookings/all', verifyToken, verifyManager, getAllBookings);

// Admin only
router.delete('/users/:id', verifyToken, verifyAdmin, deleteUser);
```

**5. Frontend Route Protection:**
```javascript
<Route path="/admin/*" element={
  <AdminPrivateRoute>
    <AdminDashboard />
  </AdminPrivateRoute>
} />

// AdminPrivateRoute component
const AdminPrivateRoute = ({ children }) => {
  const { currentUser } = useSelector(state => state.user);
  
  if (!currentUser) {
    return <Navigate to="/sign-in" />;
  }
  
  if (currentUser.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
};
```

This ensures both frontend (UI) and backend (enforcement) authorization."

---

### **Database**

#### **Q13: Why MongoDB over PostgreSQL?**

**Answer:**
"I chose MongoDB for these reasons:

**Advantages for this project:**

**1. Flexible Schema:**
Movies have varying metadata (cast array, crew object). MongoDB handles this naturally without ALTER TABLE migrations.

**2. JavaScript Everywhere:**
Same data structures (JSON) on frontend, backend, and database. No ORM translation.

**3. Easier Horizontal Scaling:**
MongoDB's sharding is more straightforward than PostgreSQL partitioning.

**4. Good for Read-Heavy Workloads:**
Movie listings, seat availability are read-heavy. MongoDB excels here with replica sets.

**5. Aggregation Framework:**
Complex analytics queries (booking statistics) are elegant with MongoDB pipelines.

**PostgreSQL would be better if:**

**1. Complex Transactions:**
MongoDB transactions are relatively new and less mature.

**2. Strong ACID Guarantees:**
Critical for financial systems.

**3. Complex Joins:**
If queries frequently need 5+ table joins.

**4. Company Standard:**
If the team is PostgreSQL-focused.

**My Decision:**
For a cinema booking system, the flexible schema, horizontal scaling, and JavaScript ecosystem integration made MongoDB the better choice. If handling complex financial transactions beyond Stripe integration, I'd reconsider PostgreSQL."

---

#### **Q14: How do you handle relationships in MongoDB?**

**Answer:**
"I use a hybrid approach:

**Document References (Most Common):**
```javascript
// Booking references other entities
{
  userId: ObjectId('...'),
  movieId: ObjectId('...'),
  showtimeId: ObjectId('...'),
  seatIds: [ObjectId('...'), ObjectId('...')]
}

// Populate when needed
const booking = await Booking.findById(id)
  .populate('userId', 'username email')
  .populate('movieId', 'title poster')
  .populate('showtimeId', 'startTime endTime screen')
  .populate('seatIds', 'seatNumber category');
```

**Embedded Documents (For Immutable Data):**
```javascript
// Movie crew (doesn't change, always needed)
{
  title: 'Inception',
  crew: {
    director: 'Christopher Nolan',
    writer: 'Christopher Nolan',
    producers: ['Emma Thomas', 'Christopher Nolan']
  }
}
```

**Denormalization (For Performance):**
```javascript
// Store movie title in booking for faster queries
{
  movieId: ObjectId('...'),
  movieTitle: 'Inception',  // Denormalized
  showtimeStart: new Date() // Denormalized
}

// Trade-off: Faster reads, but must update if movie renamed (rare)
```

**Design Decision Factors:**

1. **Frequency of Access:** If data is always retrieved together, embed it
2. **Update Frequency:** If data rarely changes, denormalize
3. **Size:** If subdocuments could grow unbounded, use references
4. **Consistency:** If data must stay in sync across documents, use references

For this project, seats and showtimes change frequently and are queried independently, so references make sense."

---

#### **Q15: Explain your indexing strategy.**

**Answer:**
"I created indexes based on query patterns:

**1. Compound Index (Prevent Overlaps):**
```javascript
showtimeSchema.index({ screen: 1, startTime: 1, endTime: 1 });

// Query performance
await Showtime.find({ 
  screen: 'Screen 1',
  startTime: { $lt: newEndTime },
  endTime: { $gt: newStartTime }
});
// Without index: 250ms
// With index: 15ms
```

**2. Unique Compound Index (Prevent Duplicates):**
```javascript
seatSchema.index({ showtimeId: 1, seatNumber: 1 }, { unique: true });

// Prevents creating two 'A1' seats for same showtime
```

**3. TTL Index (Auto-Deletion):**
```javascript
seatSchema.index({ holdUntil: 1 }, { expireAfterSeconds: 0 });

// MongoDB automatically removes documents where holdUntil < now
// Backup to cron job for releasing holds
```

**4. Text Index (Search):**
```javascript
movieSchema.index({ title: 'text', genre: 'text' });

// Full-text search
await Movie.find({ $text: { $search: 'action thriller' } });
```

**5. Single Field Index (Frequent Filters):**
```javascript
userSchema.index({ email: 1 }, { unique: true });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ paymentStatus: 1 });
```

**Index Trade-offs:**
- **Pros:** Faster queries (100x improvement for large collections)
- **Cons:** Slower writes (index must be updated), more storage

**Monitoring:**
```javascript
// Check if index is used
db.seats.find({ showtimeId: '...' }).explain('executionStats');

// Look for:
// - executionStages.stage: 'IXSCAN' (good - uses index)
// - executionStages.stage: 'COLLSCAN' (bad - table scan)
```

I only index fields that are frequently queried or used in sorting."

---

### **Frontend**

#### **Q16: How do you manage side effects in React?**

**Answer:**
"I use useEffect for side effects:

**1. Data Fetching:**
```javascript
useEffect(() => {
  const fetchMovies = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/movies');
      setMovies(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  fetchMovies();
}, []);  // Empty dependency array - runs once on mount
```

**2. Real-Time Subscriptions:**
```javascript
useEffect(() => {
  const socket = io(serverURL);
  
  socket.emit('joinShowtime', showtimeId);
  
  socket.on('seatsUpdated', (updatedSeats) => {
    setSeats(prevSeats => 
      prevSeats.map(seat => 
        updatedSeats.find(u => u._id === seat._id) || seat
      )
    );
  });
  
  // Cleanup function
  return () => {
    socket.emit('leaveShowtime', showtimeId);
    socket.disconnect();
  };
}, [showtimeId]);  // Re-run if showtime changes
```

**3. Session Validation:**
```javascript
useEffect(() => {
  const validateSession = async () => {
    try {
      const response = await axios.get('/api/auth/validate-session');
      dispatch(signInSuccess(response.data.user));
    } catch (error) {
      dispatch(signOut());
    }
  };
  
  validateSession();
}, []);  // Check on app load
```

**4. Event Listeners:**
```javascript
useEffect(() => {
  const handleResize = () => setWindowWidth(window.innerWidth);
  
  window.addEventListener('resize', handleResize);
  
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Common Pitfalls I Avoid:**

❌ **Missing Dependencies:**
```javascript
useEffect(() => {
  fetchData(userId);  // Uses userId but not in dependencies
}, []);  // Will use stale userId!
```

✅ **Include Dependencies:**
```javascript
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

❌ **No Cleanup:**
```javascript
useEffect(() => {
  const interval = setInterval(() => fetchData(), 5000);
  // No cleanup - memory leak!
}, []);
```

✅ **Cleanup:**
```javascript
useEffect(() => {
  const interval = setInterval(() => fetchData(), 5000);
  return () => clearInterval(interval);
}, []);
```"

---

#### **Q17: How do you prevent unnecessary re-renders?**

**Answer:**
"Multiple optimization techniques:

**1. React.memo for Components:**
```javascript
const SeatButton = React.memo(({ seat, onClick }) => {
  return (
    <button onClick={() => onClick(seat)} className={seat.status}>
      {seat.seatNumber}
    </button>
  );
}, (prevProps, nextProps) => {
  // Only re-render if seat status changes
  return prevProps.seat.status === nextProps.seat.status;
});
```

**2. useCallback for Functions:**
```javascript
// Without useCallback - new function on every render
const handleSeatClick = (seat) => { ... };

// With useCallback - same function reference
const handleSeatClick = useCallback((seat) => {
  dispatch(selectSeat(seat));
}, [dispatch]);
```

**3. useMemo for Expensive Calculations:**
```javascript
// Expensive filtering
const availableSeats = useMemo(() => {
  return seats.filter(seat => seat.status === 'AVAILABLE');
}, [seats]);  // Only recalculate when seats change
```

**4. Selector Optimization (Redux):**
```javascript
// BAD - creates new object every time
const data = useSelector(state => ({
  user: state.user,
  movies: state.movies
}));

// GOOD - separate selectors
const user = useSelector(state => state.user);
const movies = useSelector(state => state.movies);
```

**5. Virtual Scrolling for Long Lists:**
```javascript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={movies.length}
  itemSize={200}
>
  {({ index, style }) => (
    <div style={style}>
      <MovieCard movie={movies[index]} />
    </div>
  )}
</FixedSizeList>
```

**6. Code Splitting:**
```javascript
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

<Suspense fallback={<Loading />}>
  <AdminDashboard />
</Suspense>
```

**Profiling:**
I use React DevTools Profiler to identify components that re-render frequently and optimize them."

---

### **Payment Integration**

#### **Q18: How does Stripe payment integration work?**

**Answer:**
"I use Stripe for secure payment processing:

**1. Frontend Setup:**
```javascript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY);

<Elements stripe={stripePromise}>
  <PaymentForm />
</Elements>
```

**2. Create Payment Intent (Backend):**
```javascript
export const createPaymentIntent = async (req, res) => {
  const { amount, bookingId } = req.body;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,  // Stripe uses cents
      currency: 'usd',
      metadata: { bookingId: bookingId.toString() }
    });
    
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

**3. Collect Payment (Frontend):**
```javascript
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

const stripe = useStripe();
const elements = useElements();

const handlePayment = async () => {
  // Get client secret from backend
  const { clientSecret } = await createPaymentIntent(totalCost);
  
  // Confirm payment
  const { error, paymentIntent } = await stripe.confirmCardPayment(
    clientSecret,
    {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: user.username,
          email: user.email
        }
      }
    }
  );
  
  if (error) {
    Swal.fire('Payment Failed', error.message, 'error');
  } else if (paymentIntent.status === 'succeeded') {
    // Update booking status
    await confirmBooking(bookingId, paymentIntent.id);
    navigate('/booking-confirmation');
  }
};
```

**4. Confirm Booking (Backend):**
```javascript
export const confirmPayment = async (req, res) => {
  const { bookingId, paymentIntentId } = req.body;
  
  try {
    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }
    
    // Update booking
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: 'COMPLETED',
        paymentIntentId: paymentIntentId
      },
      { new: true }
    );
    
    // Update seats to SOLD
    await Seat.updateMany(
      { _id: { $in: booking.seatIds } },
      { status: 'SOLD' }
    );
    
    // Send confirmation email
    await sendBookingConfirmation(booking);
    
    res.json({ booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

**Security:**
- Card details never touch my server (Stripe.js handles it)
- Use HTTPS for all communication
- Verify payment on backend before updating booking
- Store payment intent ID for refund capability

**Test Mode:**
I use test keys in development with card number 4242 4242 4242 4242."

---

#### **Q19: How do you handle failed payments?**

**Answer:**
"Multiple failure scenarios:

**1. Card Declined:**
```javascript
const { error } = await stripe.confirmCardPayment(clientSecret, {...});

if (error) {
  if (error.type === 'card_error') {
    Swal.fire('Card Declined', error.message, 'error');
    // Allow user to retry with different card
  }
}
```

**2. Network Failure:**
```javascript
try {
  await confirmPayment(bookingId, paymentIntentId);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Payment may or may not have succeeded
    // Show 'Verifying...' message
    // Poll backend to check payment status
    const status = await checkPaymentStatus(bookingId);
  }
}
```

**3. Seat No Longer Available:**
```javascript
export const confirmPayment = async (req, res) => {
  const booking = await Booking.findById(bookingId);
  
  // Check seats still held by this user
  const seats = await Seat.find({
    _id: { $in: booking.seatIds },
    userId: req.user.id,
    status: 'HELD'
  });
  
  if (seats.length !== booking.seatIds.length) {
    // Refund payment
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer'
    });
    
    return res.status(400).json({ 
      message: 'Seats no longer available. Payment refunded.' 
    });
  }
  
  // Proceed with booking...
};
```

**4. Webhook for Reliability:**
```javascript
// Handle webhook events from Stripe
app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata.bookingId;
    
    // Ensure booking is confirmed even if user closed browser
    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'COMPLETED',
      paymentIntentId: paymentIntent.id
    });
  }
  
  res.json({ received: true });
});
```

This ensures no money is charged without a confirmed booking, and no bookings are confirmed without payment."

---

### **Deployment**

#### **Q20: Walk me through your deployment process.**

**Answer:**
"I use a CI/CD approach with Git-based deployments:

**1. Development:**
```bash
# Local development
npm run dev  # Starts both frontend and backend

# Feature branch
git checkout -b feature/seat-selection
# ... make changes ...
git commit -m "Add seat selection UI"
git push origin feature/seat-selection
```

**2. Code Review:**
- Create pull request on GitHub
- Automated tests run (if configured)
- Code review by team
- Merge to main branch

**3. Automatic Deployment:**

**Frontend (Vercel):**
```
1. Push to main
2. Vercel detects changes in client/
3. Runs: npm install && npm run build
4. Deploys dist/ to global CDN
5. Updates www.cinexp.app
6. DNS updates propagate (~30 seconds)
```

**Backend (Render):**
```
1. Push to main
2. Render detects changes
3. Runs: npm install
4. Restarts server with: node api/index.js
5. Health check verifies /api/health responds
6. Traffic switches to new version
7. Old version kept running for 60s (zero-downtime)
```

**4. Database Migrations:**
```javascript
// Mongoose auto-creates collections
// For schema changes:
// 1. Add new field with default value
// 2. Deploy backend
// 3. Run migration script if needed:

const migrateBookings = async () => {
  await Booking.updateMany(
    { paymentMethod: { $exists: false } },
    { $set: { paymentMethod: 'stripe' } }
  );
};
```

**5. Environment Variables:**
- Set in Vercel/Render dashboard (not in code)
- Different values for staging vs production

**6. Rollback Strategy:**
```
Vercel: Dashboard → Deployments → Instant Rollback
Render: Dashboard → Manual Deploy → Previous commit
```

**7. Monitoring:**
- Sentry for error tracking
- Render metrics for CPU/memory
- Vercel analytics for frontend performance

**Zero-Downtime Deployment:**
Render keeps old version running until new version passes health check, then switches traffic."

---

## 🔥 20 Deep Follow-up Questions

### **Q21: What if two users try to book the same seat at the exact same millisecond?**

**Answer:**
"MongoDB's atomic operations handle this:

```javascript
const seat = await Seat.findOneAndUpdate(
  { _id: seatId, status: 'AVAILABLE' },  // Condition
  { status: 'HELD', userId },
  { new: true }
);
```

MongoDB processes these sequentially at the document level. The first request that reaches MongoDB will succeed and get the seat. The second request will fail because the status is no longer 'AVAILABLE'.

The atomicity guarantee means it's impossible for both to succeed. One user gets the seat, the other gets a 409 Conflict error and must select another seat.

**For even stronger guarantees**, I'd use MongoDB transactions:

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  const seat = await Seat.findOne({ 
    _id: seatId, 
    status: 'AVAILABLE' 
  }).session(session);
  
  if (!seat) throw new Error('Seat not available');
  
  seat.status = 'HELD';
  seat.userId = userId;
  await seat.save({ session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

Transactions ensure ACID properties even across multiple documents."

---

### **Q22: How would you handle 10,000 concurrent users selecting seats?**

**Answer:**
"The current architecture wouldn't handle this. I'd implement:

**1. Queue System:**
```javascript
import Queue from 'bull';
import Redis from 'ioredis';

const seatQueue = new Queue('seat-selection', {
  redis: { host: 'localhost', port: 6379 }
});

// Client request
app.post('/api/seats/select', async (req, res) => {
  const job = await seatQueue.add({
    seatId: req.body.seatId,
    userId: req.user.id
  });
  
  res.json({ jobId: job.id, status: 'queued' });
});

// Worker processes queue
seatQueue.process(async (job) => {
  const { seatId, userId } = job.data;
  return await selectSeat(seatId, userId);
});
```

**2. Caching Layer:**
```javascript
// Cache seat availability in Redis
const getCachedSeats = async (showtimeId) => {
  const cached = await redis.get(`seats:${showtimeId}`);
  
  if (cached) return JSON.parse(cached);
  
  const seats = await Seat.find({ showtimeId }).lean();
  await redis.setex(`seats:${showtimeId}`, 60, JSON.stringify(seats));
  
  return seats;
};
```

**3. Database Scaling:**
- Read replicas for seat availability queries
- Write to primary for seat selection
- Connection pool size: 50+ connections

**4. Load Balancing:**
```
                    Load Balancer
                    /    |    \\
                   /     |     \\
             Server1  Server2  Server3
                  \\     |     /
                   \\    |    /
                  MongoDB Primary
```

**5. WebSocket Scaling:**
```javascript
// Use Redis adapter for Socket.IO
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = new Redis();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```
Allows Socket.IO to work across multiple server instances.

**Expected Performance:**
- Queue handles burst traffic
- Cache reduces DB load by 80%
- Load balancer distributes requests
- Result: Can handle 10,000+ concurrent users"

---

### **Q23: What's your strategy for database backup and disaster recovery?**

**Answer:**
"Multi-layer backup strategy:

**1. MongoDB Atlas Automatic Backups:**
- Continuous cloud backups (every 6 hours)
- Point-in-time restore (to any second in last 7 days)
- Download snapshots for off-site storage
- Cost: Included in M10+ clusters

**2. Manual Exports:**
```bash
# Export collections
mongodump --uri="mongodb+srv://..." --out=/backups/$(date +%Y-%m-%d)

# Scheduled cron job (daily)
0 2 * * * /scripts/backup-mongodb.sh
```

**3. Critical Data Redundancy:**
```javascript
// For confirmed bookings, also log to separate collection
await BookingArchive.create({
  ...booking,
  archivedAt: new Date(),
  originalId: booking._id
});
```

**4. Disaster Recovery Plan:**

**Scenario: Database Corruption**
1. Stop application (maintenance mode)
2. Assess extent of corruption
3. Restore from latest snapshot (MongoDB Atlas: ~15 minutes)
4. Verify data integrity
5. Restart application

**Scenario: Accidental Deletion**
```javascript
// Soft delete pattern
userSchema.add({
  deletedAt: { type: Date, default: null }
});

// Instead of deleting
await User.findByIdAndUpdate(id, { deletedAt: new Date() });

// Filter in queries
await User.find({ deletedAt: null });

// Can restore within 30 days
await User.findByIdAndUpdate(id, { deletedAt: null });
```

**5. Testing Backups:**
```bash
# Monthly drill: Restore to staging environment
mongorestore --uri="mongodb+srv://staging..." /backups/latest
```

**6. Replication:**
MongoDB Atlas automatically uses 3-node replica sets:
- Primary node (writes)
- Secondary nodes (eventual consistency reads)
- Automatic failover if primary fails

**RTO (Recovery Time Objective):** 30 minutes  
**RPO (Recovery Point Objective):** 6 hours maximum data loss"

---

### **Q24: How would you implement a waiting list for sold-out shows?**

**Answer:**
"I'd add a WaitingList model:

**1. Schema:**
```javascript
const waitingListSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  showtimeId: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
  seatCategory: { type: String, enum: ['Gold', 'Platinum', 'Silver', 'Diamond', 'Balcony'] },
  quantity: { type: Number, required: true, min: 1, max: 10 },
  joinedAt: { type: Date, default: Date.now },
  notified: { type: Boolean, default: false },
  expiresAt: { type: Date }  // For cleanup
});

waitingListSchema.index({ showtimeId: 1, joinedAt: 1 });
waitingListSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

**2. Join Waiting List:**
```javascript
export const joinWaitingList = async (req, res) => {
  const { showtimeId, seatCategory, quantity } = req.body;
  
  // Check if already on waiting list
  const existing = await WaitingList.findOne({
    userId: req.user.id,
    showtimeId
  });
  
  if (existing) {
    return res.status(400).json({ message: 'Already on waiting list' });
  }
  
  await WaitingList.create({
    userId: req.user.id,
    showtimeId,
    seatCategory,
    quantity,
    expiresAt: addDays(new Date(), 7)  // Auto-remove after 7 days
  });
  
  res.json({ message: 'Added to waiting list' });
};
```

**3. Notification on Cancellation:**
```javascript
export const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  
  // Release seats
  await Seat.updateMany(
    { _id: { $in: booking.seatIds } },
    { status: 'AVAILABLE', $unset: { userId: 1 } }
  );
  
  // Notify waiting list
  const waitingUsers = await WaitingList.find({
    showtimeId: booking.showtimeId,
    notified: false
  })
  .sort({ joinedAt: 1 })
  .limit(10)
  .populate('userId', 'email username');
  
  for (const entry of waitingUsers) {
    // Send email
    await sendEmail({
      to: entry.userId.email,
      subject: 'Tickets Available!',
      text: `Tickets are now available for your waitlisted show.`
    });
    
    // Send push notification
    io.to(`user-${entry.userId._id}`).emit('seats-available', {
      showtimeId: booking.showtimeId
    });
    
    entry.notified = true;
    await entry.save();
  }
  
  res.json({ message: 'Booking cancelled' });
};
```

**4. Priority Booking Window:**
```javascript
// Give waitlisted users 15-minute priority
const seat = await Seat.findOne({ _id: seatId, status: 'AVAILABLE' });

if (seat) {
  // Check if user is on waiting list
  const waitlisted = await WaitingList.findOne({
    userId: req.user.id,
    showtimeId: seat.showtimeId,
    notified: true
  });
  
  if (!waitlisted) {
    // Check if still in priority window (15 min since notification)
    const recentlyNotified = await WaitingList.findOne({
      showtimeId: seat.showtimeId,
      notified: true,
      updatedAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    });
    
    if (recentlyNotified) {
      return res.status(403).json({ 
        message: 'Currently in priority booking window for waitlisted users' 
      });
    }
  }
  
  // Proceed with booking...
}
```

**5. Frontend UI:**
```javascript
<button onClick={joinWaitingList}>
  Join Waiting List ({waitingListCount} waiting)
</button>

// Show badge if seats become available
{isNotified && (
  <Alert>Seats are now available! Book within 15 minutes</Alert>
)}
```

This creates a fair system prioritizing users who showed interest first."

---

### **Q25: How do you prevent SQL/NoSQL injection?**

**Answer:**
"Multiple layers of protection:

**1. Mongoose Automatic Sanitization:**
```javascript
// User input
const email = req.body.email;  // Could be: { $ne: null }

// Mongoose typecast it to string
const user = await User.findOne({ email });
// Query becomes: { email: '{ $ne: null }' } (literal string)
```

Mongoose validates against schema types, preventing unauthorized operators.

**2. express-mongo-sanitize:**
```javascript
import mongoSanitize from 'express-mongo-sanitize';

app.use(mongoSanitize());

// Removes $ and . characters from req.body, req.query, req.params
// Input: { email: { $ne: null } }
// Output: { email: {} }
```

**3. Input Validation:**
```javascript
import { body, validationResult } from 'express-validator';

app.post('/api/auth/signin',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Safe to proceed
  }
);
```

**4. Avoid String Concatenation:**
```javascript
// ❌ VULNERABLE
const query = `db.users.find({ username: '${username}' })`;

// ✅ SAFE - Use parameterized queries
const user = await User.findOne({ username });
```

**5. Whitelist Allowed Fields:**
```javascript
const allowedFilters = ['genre', 'year', 'rating'];

app.get('/api/movies', async (req, res) => {
  const filters = {};
  
  for (const [key, value] of Object.entries(req.query)) {
    if (allowedFilters.includes(key)) {
      filters[key] = value;
    }
  }
  
  const movies = await Movie.find(filters);
  res.json(movies);
});
```

**6. Type Coercion:**
```javascript
// Ensure IDs are valid ObjectIds
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ message: 'Invalid ID' });
}
```

**Example Attack Prevented:**
```javascript
// Malicious request
POST /api/auth/signin
{
  "email": { "$ne": null },
  "password": { "$ne": null }
}

// Without protection: Logs in as first user!
// With protection: Email is cast to string, query fails
```

I don't have SQL injection because I don't use SQL. For NoSQL injection, Mongoose and sanitization middleware provide strong protection."

---

*(Continuing Q26-Q40...)*

### **Q26: Explain your session management strategy.**

**Answer:**
"I use stateless JWT authentication with careful session handling:

**Token Lifecycle:**

**1. Creation (Login):**
```javascript
const token = jwt.sign(
  { id: user._id, iat: Date.now() },  // Issued at timestamp
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

res.cookie('access_token', token, {
  httpOnly: true,     // Can't be accessed by JavaScript
  secure: true,       // HTTPS only
  sameSite: 'none',   // Cross-site requests (frontend on different domain)
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});
```

**2. Validation (Every Request):**
```javascript
const token = req.cookies.access_token || 
              req.headers['authorization']?.split(' ')[1];

jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
  if (err) return next(errorHandler(403, 'Invalid token'));
  req.user = decoded;  // { id: userId, iat: timestamp }
  next();
});
```

**3. Refresh (Before Expiry):**
```javascript
// Frontend checks expiry
const token = localStorage.getItem('access_token');
const decoded = jwt.decode(token);
const expiresAt = decoded.exp * 1000;

if (Date.now() > expiresAt - 24 * 60 * 60 * 1000) {  // 1 day before expiry
  await refreshToken();
}
```

**4. Logout:**
```javascript
export const logout = (req, res) => {
  res.clearCookie('access_token');
  res.json({ message: 'Logged out successfully' });
};

// Frontend also clears Redux state
dispatch(signOut());
```

**Session Security:**

**1. HttpOnly Cookies:**
Token can't be accessed by JavaScript, preventing XSS token theft.

**2. SameSite Attribute:**
Protects against CSRF. `SameSite=None` allows cross-origin (frontend on Vercel, backend on Render), but still requires `Secure=true`.

**3. Short Expiry + Refresh:**
7 days is actually too long for production. I'd implement:
```javascript
// Access token: 15 minutes
// Refresh token: 7 days, stored in database

const accessToken = jwt.sign({ id: user._id }, secret, { expiresIn: '15m' });
const refreshToken = jwt.sign({ id: user._id, type: 'refresh' }, refreshSecret, { expiresIn: '7d' });

await RefreshToken.create({ token: refreshToken, userId: user._id });
```

**4. Token Revocation:**
For logout from all devices:
```javascript
// Add jti (JWT ID) to token
const token = jwt.sign({ id: user._id, jti: uuidv4() }, secret);

// Store active JTI in database
await ActiveToken.create({ jti, userId });

// Verify checks if JTI exists
const isActive = await ActiveToken.findOne({ jti: decoded.jti });
if (!isActive) return next(errorHandler(401, 'Token revoked'));
```

**5. Device Tracking:**
```javascript
const token = jwt.sign({
  id: user._id,
  device: req.get('User-Agent'),
  ip: req.ip
}, secret);

// Alert on suspicious login
if (decoded.ip !== req.ip) {
  await sendSecurityAlert(user.email);
}
```

**Trade-offs:**
- **Stateless JWT:** No database lookup per request (fast), but can't revoke tokens easily
- **Stateful Sessions:** Can revoke instantly, but requires database/Redis lookup per request (slower)

For a booking system where users may want to logout from all devices, I'd consider hybrid: JTI in Redis for revocation without database load."

---

### **Q27: How would you implement rate limiting per user (not per IP)?**

**Answer:**
"I'd use Redis with user-based keys:

**1. Middleware:**
```javascript
import Redis from 'ioredis';
const redis = new Redis();

export const rateLimitByUser = (maxRequests = 100, windowSeconds = 60) => {
  return async (req, res, next) => {
    if (!req.user?.id) {
      return next();  // Skip for unauthenticated requests
    }
    
    const key = `ratelimit:${req.user.id}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    
    const requests = await redis.incr(key);
    
    if (requests === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    if (requests > maxRequests) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.',
        retryAfter: await redis.ttl(key)
      });
    }
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requests));
    res.setHeader('X-RateLimit-Reset', await redis.ttl(key));
    
    next();
  };
};
```

**2. Different Limits for Different Roles:**
```javascript
const getRateLimit = (user) => {
  switch (user.role) {
    case 'admin': return 1000;   // Admin can make 1000 req/min
    case 'manager': return 500;
    case 'staff': return 200;
    default: return 100;          // Regular users: 100 req/min
  }
};

export const rateLimitByUser = async (req, res, next) => {
  const maxRequests = getRateLimit(req.userData);
  // ... rest of logic
};
```

**3. Endpoint-Specific Limits:**
```javascript
// Stricter limit for expensive operations
router.post('/bookings',
  verifyToken,
  rateLimitByUser(10, 60),  // 10 bookings per minute
  createBooking
);

// Generous limit for reads
router.get('/movies',
  rateLimitByUser(200, 60),  // 200 requests per minute
  getMovies
);
```

**4. Sliding Window Algorithm:**
```javascript
export const slidingWindowRateLimit = async (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  const window = 60000;  // 1 minute
  const maxRequests = 100;
  
  const key = `ratelimit:${userId}`;
  
  // Add current request with timestamp score
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  
  // Remove requests outside window
  await redis.zremrangebyscore(key, 0, now - window);
  
  // Count requests in window
  const requestCount = await redis.zcard(key);
  
  // Set expiry
  await redis.expire(key, 60);
  
  if (requestCount > maxRequests) {
    return res.status(429).json({ message: 'Rate limit exceeded' });
  }
  
  next();
};
```

**5. Burst Allowance:**
```javascript
// Allow burst of 20 requests, then 100 per minute sustained
const burst = await redis.get(`burst:${userId}`) || 20;

if (burst > 0) {
  await redis.decr(`burst:${userId}`);
  return next();
}

// Fall back to regular rate limiting
// ...
```

**6. Graceful Degradation:**
```javascript
export const rateLimitByUser = async (req, res, next) => {
  try {
    // Rate limiting logic...
  } catch (error) {
    // If Redis is down, log error but allow request
    console.error('Rate limiting failed:', error);
    next();
  }
};
```

**Why Redis?**
- In-memory (extremely fast)
- Atomic operations (INCR, ZADD)
- Built-in TTL for automatic cleanup
- Shared across multiple server instances

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 42
```

Helps clients implement backoff strategies."

---

### **Q28: How do you optimize database queries for analytics dashboards?**

**Answer:**
"Analytics queries can be expensive. I use aggregation pipelines and caching:

**1. Aggregation Pipeline (Efficient):**
```javascript
export const getBookingStats = async (req, res) => {
  const stats = await Booking.aggregate([
    // Filter completed bookings
    { $match: { paymentStatus: 'COMPLETED' } },
    
    // Join with movies
    { $lookup: {
      from: 'movies',
      localField: 'movieId',
      foreignField: '_id',
      as: 'movie'
    }},
    
    // Unwind movie array
    { $unwind: '$movie' },
    
    // Group by movie
    { $group: {
      _id: '$movieId',
      movieTitle: { $first: '$movie.title' },
      totalBookings: { $sum: 1 },
      totalRevenue: { $sum: '$totalCost' },
      averageBookingValue: { $avg: '$totalCost' },
      uniqueUsers: { $addToSet: '$userId' }
    }},
    
    // Count unique users
    { $addFields: {
      uniqueUsers: { $size: '$uniqueUsers' }
    }},
    
    // Sort by revenue
    { $sort: { totalRevenue: -1 } },
    
    // Limit results
    { $limit: 10 }
  ]);
  
  res.json(stats);
};
```

**2. Denormalization for Faster Queries:**
```javascript
// Store movieTitle in booking for faster reports
const bookingSchema = new Schema({
  movieId: ObjectId,
  movieTitle: String,  // Denormalized
  totalCost: Number,
  createdAt: Date
});

// Update on movie rename (rare)
await Booking.updateMany(
  { movieId: movie._id },
  { movieTitle: movie.title }
);

// Analytics query (no join needed)
const stats = await Booking.aggregate([
  { $match: { paymentStatus: 'COMPLETED' } },
  { $group: {
    _id: '$movieTitle',
    totalRevenue: { $sum: '$totalCost' }
  }}
]);
```

**3. Materialized Views (Pre-computed):**
```javascript
// DailyStats collection stores pre-computed data
const dailyStatsSchema = new Schema({
  date: { type: Date, required: true, unique: true },
  totalBookings: Number,
  totalRevenue: Number,
  topMovie: String,
  newUsers: Number
});

// Cron job computes daily (overnight)
cron.schedule('0 1 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const bookings = await Booking.find({
    createdAt: {
      $gte: yesterday,
      $lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
    },
    paymentStatus: 'COMPLETED'
  });
  
  const stats = {
    date: yesterday,
    totalBookings: bookings.length,
    totalRevenue: bookings.reduce((sum, b) => sum + b.totalCost, 0),
    // ... more stats
  };
  
  await DailyStats.create(stats);
});

// Dashboard query (instant)
const last30Days = await DailyStats.find({
  date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
}).sort({ date: 1 });
```

**4. Caching with Redis:**
```javascript
export const getBookingStats = async (req, res) => {
  const cacheKey = 'stats:bookings:daily';
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Compute stats
  const stats = await Booking.aggregate([...]);
  
  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(stats));
  
  res.json(stats);
};
```

**5. Indexes for Analytics:**
```javascript
bookingSchema.index({ paymentStatus: 1, createdAt: -1 });
bookingSchema.index({ movieId: 1, paymentStatus: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

// Compound index for common query
bookingSchema.index({ 
  paymentStatus: 1, 
  createdAt: -1, 
  totalCost: 1 
});
```

**6. Pagination for Large Results:**
```javascript
const page = parseInt(req.query.page) || 1;
const limit = 50;

const bookings = await Booking.aggregate([
  { $match: { paymentStatus: 'COMPLETED' } },
  { $facet: {
    metadata: [{ $count: 'total' }],
    data: [
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]
  }}
]);

res.json({
  bookings: bookings[0].data,
  total: bookings[0].metadata[0]?.total || 0,
  page,
  totalPages: Math.ceil((bookings[0].metadata[0]?.total || 0) / limit)
});
```

**7. Database Read Replicas:**
```javascript
// Read from replica for analytics (eventual consistency OK)
mongoose.connect(process.env.MONGO_READ_REPLICA, {
  readPreference: 'secondaryPreferred'
});

const stats = await Booking.aggregate([...]);
```

**Performance:**
- Without optimization: 2500ms
- With aggregation: 800ms
- With aggregation + indexes: 200ms
- With caching: 15ms

For real-time dashboards, I'd use WebSocket to push updates instead of polling."

---

### **Q29: What testing strategy would you implement?**

**Answer:**
"Comprehensive testing at multiple levels:

**1. Unit Tests (Jest):**
```javascript
// __tests__/utils/validation.test.js
import { validateEmail, validatePassword } from '../utils/validation';

describe('Email Validation', () => {
  test('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
  
  test('rejects invalid emails', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });
});

describe('Password Validation', () => {
  test('requires minimum 8 characters', () => {
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('LongP@ss123')).toBe(true);
  });
  
  test('requires uppercase, lowercase, number, special char', () => {
    expect(validatePassword('alllowercase')).toBe(false);
    expect(validatePassword('Uppercase123')).toBe(false);
    expect(validatePassword('UpperLower')).toBe(false);
    expect(validatePassword('Valid123!')).toBe(true);
  });
});
```

**2. Integration Tests (Supertest for API):**
```javascript
// __tests__/api/auth.test.js
import request from 'supertest';
import app from '../api/index';
import User from '../api/models/user.model';

describe('Auth API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });
  
  describe('POST /api/auth/signup', () => {
    test('creates new user', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).not.toHaveProperty('password');
    });
    
    test('rejects duplicate email', async () => {
      await User.create({
        username: 'existing',
        email: 'test@example.com',
        password: 'hashed'
      });
      
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email already exists');
    });
  });
  
  describe('POST /api/auth/signin', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!'
        });
    });
    
    test('returns token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username');
      expect(response.headers['set-cookie']).toBeDefined();
    });
    
    test('rejects invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });
      
      expect(response.status).toBe(401);
    });
  });
});
```

**3. Component Tests (React Testing Library):**
```javascript
// __tests__/components/SeatButton.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import SeatButton from '../components/SeatButton';

describe('SeatButton', () => {
  const mockSeat = {
    _id: '123',
    seatNumber: 'A1',
    status: 'AVAILABLE',
    category: 'Gold'
  };
  
  test('renders seat number', () => {
    render(<SeatButton seat={mockSeat} onSelect={() => {}} />);
    expect(screen.getByText('A1')).toBeInTheDocument();
  });
  
  test('calls onSelect when clicked', () => {
    const handleSelect = jest.fn();
    render(<SeatButton seat={mockSeat} onSelect={handleSelect} />);
    
    fireEvent.click(screen.getByText('A1'));
    expect(handleSelect).toHaveBeenCalledWith(mockSeat);
  });
  
  test('is disabled when status is SOLD', () => {
    const soldSeat = { ...mockSeat, status: 'SOLD' };
    render(<SeatButton seat={soldSeat} onSelect={() => {}} />);
    
    const button = screen.getByText('A1');
    expect(button).toBeDisabled();
  });
  
  test('shows different color for seat categories', () => {
    const { rerender } = render(
      <SeatButton seat={{ ...mockSeat, category: 'Gold' }} onSelect={() => {}} />
    );
    expect(screen.getByText('A1')).toHaveClass('bg-yellow-500');
    
    rerender(
      <SeatButton seat={{ ...mockSeat, category: 'Platinum' }} onSelect={() => {}} />
    );
    expect(screen.getByText('A1')).toHaveClass('bg-gray-300');
  });
});
```

**4. E2E Tests (Cypress/Playwright):**
```javascript
// e2e/booking-flow.spec.js
describe('Booking Flow', () => {
  it('completes full booking journey', () => {
    // Visit homepage
    cy.visit('/');
    
    // Select movie
    cy.contains('Inception').click();
    
    // Select showtime
    cy.contains('7:00 PM').click();
    
    // Select seats
    cy.get('[data-seat="A1"]').click();
    cy.get('[data-seat="A2"]').click();
    
    // Confirm selection
    cy.contains('Continue').click();
    
    // Fill payment info
    cy.get('[data-testid="card-number"]').type('4242424242424242');
    cy.get('[data-testid="expiry"]').type('12/25');
    cy.get('[data-testid="cvc"]').type('123');
    
    // Submit payment
    cy.contains('Pay Now').click();
    
    // Verify confirmation
    cy.contains('Booking Confirmed').should('be.visible');
    cy.contains('Booking Reference').should('be.visible');
  });
  
  it('prevents double booking', () => {
    cy.visit('/movie/123/showtime/456');
    
    // User 1 selects seat
    cy.get('[data-seat="A1"]').click();
    
    // Simulate another user booking the same seat
    cy.request('POST', '/api/seats/select', {
      seatId: 'seatA1',
      showtimeId: '456'
    });
    
    // User 1 tries to confirm
    cy.contains('Continue').click();
    
    // Should see error
    cy.contains('Seat no longer available').should('be.visible');
  });
});
```

**5. Load Testing (k6):**
```javascript
// load-tests/booking.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 }      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01']     // Error rate < 1%
  }
};

export default function() {
  // Get movies
  let res = http.get('https://cinimax.onrender.com/api/movies');
  check(res, { 'status 200': (r) => r.status === 200 });
  
  // Select movie
  let movieId = JSON.parse(res.body)[0]._id;
  res = http.get(`https://cinimax.onrender.com/api/movies/${movieId}`);
  check(res, { 'movie loaded': (r) => r.status === 200 });
  
  sleep(1);
}
```

**6. Security Testing:**
```javascript
// Security audit
npm audit

// Dependency scanning
npm install -g snyk
snyk test

// SQL injection testing
sqlmap -u "http://api.example.com/movies?id=1"

// XSS testing
// Manual: Try injecting <script>alert('XSS')</script>
```

**7. CI/CD Integration:**
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Coverage report
        run: npm run test:coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

**Test Coverage Goals:**
- Unit tests: 80%+ coverage
- Integration tests: Critical paths (auth, booking, payment)
- E2E tests: Happy paths + error scenarios
- Load tests: Before each major release

**TDD Approach:**
1. Write failing test
2. Implement minimum code to pass
3. Refactor
4. Repeat"

---

### **Q30: How do you handle time zones for showtimes?**

**Answer:**
"Cinema booking has complex timezone requirements:

**Strategy: Store in UTC, Display in Local**

**1. Database (Always UTC):**
```javascript
const showtimeSchema = new Schema({
  movieId: ObjectId,
  screen: String,
  startTime: { 
    type: Date, 
    required: true 
  },  // Stored as UTC in MongoDB
  endTime: { 
    type: Date, 
    required: true 
  }
});

// Creating showtime (convert local to UTC)
const localStartTime = new Date('2024-01-15T19:00:00');  // 7 PM local
const utcStartTime = new Date(localStartTime.toISOString());

await Showtime.create({
  movieId: '...',
  screen: 'Screen 1',
  startTime: utcStartTime,
  endTime: new Date(utcStartTime.getTime() + movie.duration * 60000)
});
```

**2. Backend Returns UTC:**
```javascript
export const getShowtimes = async (req, res) => {
  const showtimes = await Showtime.find({ isArchived: false })
    .populate('movieId')
    .lean();
  
  // Send as-is (UTC), let frontend handle conversion
  res.json(showtimes);
};
```

**3. Frontend Converts to Local:**
```javascript
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Display showtime in user's local timezone
const ShowtimeCard = ({ showtime }) => {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Convert UTC to user's local time
  const localStartTime = utcToZonedTime(showtime.startTime, userTimezone);
  
  return (
    <div>
      <p>{format(localStartTime, 'h:mm a')}</p>  {/* 7:00 PM */}
      <p>{format(localStartTime, 'MMM dd, yyyy')}</p>  {/* Jan 15, 2024 */}
    </div>
  );
};
```

**4. Booking Cutoff (15 minutes before start):**
```javascript
const isShowtimeBookable = (showtime) => {
  const now = new Date();
  const startTime = new Date(showtime.startTime);
  const cutoffTime = new Date(startTime.getTime() - 15 * 60 * 1000);
  
  return now < cutoffTime && now < new Date(showtime.endTime);
};
```

**5. Cinema-Specific Timezone (If Multi-Location):**
```javascript
// If cinema in different timezone than user
const cinemaSchema = new Schema({
  name: String,
  timezone: { type: String, default: 'America/Los_Angeles' }  // IANA timezone
});

const showtimeSchema = new Schema({
  cinemaId: ObjectId,
  startTime: Date  // Still UTC in DB
});

// Display showtime in cinema's timezone
const showtime = await Showtime.findById(id).populate('cinemaId');

// Convert UTC to cinema timezone
const cinemaLocalTime = utcToZonedTime(
  showtime.startTime,
  showtime.cinemaId.timezone
);
```

**6. Prevent Timezone Issues in Booking:**
```javascript
export const createBooking = async (req, res) => {
  const showtime = await Showtime.findById(req.body.showtimeId);
  
  // Always compare in UTC
  const now = new Date();
  const startTime = new Date(showtime.startTime);
  
  if (now > startTime) {
    return res.status(400).json({ 
      message: 'Cannot book showtime that already started' 
    });
  }
  
  // Proceed with booking...
};
```

**7. Admin Panel (Show Everything in Cinema Timezone):**
```javascript
// Admin creates showtime
const AdminShowtimeForm = () => {
  const [localTime, setLocalTime] = useState('');
  
  const handleSubmit = async () => {
    // Convert cinema local time to UTC for storage
    const cinemaTimezone = 'America/Los_Angeles';
    const localDateTime = new Date(`2024-01-15T${localTime}`);
    const utcDateTime = zonedTimeToUtc(localDateTime, cinemaTimezone);
    
    await axios.post('/api/showtimes', {
      movieId,
      screen,
      startTime: utcDateTime.toISOString()
    });
  };
  
  return (
    <input 
      type="time" 
      value={localTime}
      onChange={e => setLocalTime(e.target.value)}
    />
  );
};
```

**8. Handle Daylight Saving Time:**
```javascript
// date-fns-tz handles DST automatically
// Just use IANA timezone names ('America/Los_Angeles', 'America/New_York')

// Example: Show created during DST, viewed during standard time
// date-fns-tz adjusts offset correctly
```

**Common Pitfalls Avoided:**

❌ **Storing local time in database:**
```javascript
// DON'T
startTime: '2024-01-15 19:00:00'  // What timezone?!
```

❌ **Using toLocaleString() for conversions:**
```javascript
// DON'T - unreliable
new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
```

✅ **Always store UTC, convert on display:**
```javascript
// Database: UTC
// Frontend: Convert to user/cinema timezone
```

**Benefits:**
- Consistent data storage
- No ambiguity
- Handles DST automatically
- Multi-timezone support ready
- Accurate cutoff time calculation"

---

## 🏗️ 10 System Design Questions

### **Q31: Design a ticket booking system for 100 movie theaters.**

**Answer:**
"Multi-tenant architecture with regional distribution:

**High-Level Architecture:**

```
                    CloudFlare CDN
                          |
                    Load Balancer (Nginx)
                    /      |      \\
               Server1  Server2  Server3
                    \\      |      /
                      Redis Cluster
                           |
                      API Gateway
                    /      |      \\
           Auth Service  Booking  Notification
          /      |      Service    Service
     PostgreSQL  MongoDB  RabbitMQ
     (Users)    (Movies)  (Queue)
```

**1. Database Sharding:**
```javascript
// Shard by theater ID
const getShardKey = (theaterId) => {
  return theaterId.slice(-1);  // Last digit (0-9)
};

// Route to appropriate shard
const connection = mongoose.createConnection(
  `mongodb://shard-${getShardKey(theaterId)}.example.com/cinema`
);
```

**2. Service Architecture:**

**Auth Service (PostgreSQL):**
- Handles user authentication
- 10M users → PostgreSQL with read replicas
- JWT token generation

**Booking Service (MongoDB):**
- Manages bookings, seats, showtimes
- High write volume → MongoDB sharded
- Separate database per region

**Inventory Service:**
- Real-time seat availability
- Redis for fast reads
- Event-driven updates

**Payment Service:**
- Integrates with Stripe/PayPal
- Transaction handling
- Idempotency keys

**Notification Service:**
- Email/SMS/Push notifications
- Message queue (RabbitMQ)
- Async processing

**3. Caching Strategy:**
```
CDN (CloudFlare)
  ↓
Application Cache (Redis)
  ↓
Database Query Cache
  ↓
Database (MongoDB/PostgreSQL)
```

**4. Real-Time Seat Updates:**
```javascript
// Redis Pub/Sub for cross-server communication
const redis = new Redis();

// Server 1: Seat selected
await Seat.updateOne({ _id: seatId }, { status: 'HELD' });
redis.publish('seats:updated', JSON.stringify({ showtimeId, seatId }));

// All servers subscribe
redis.subscribe('seats:updated', (channel, message) => {
  const data = JSON.parse(message);
  io.to(`showtime-${data.showtimeId}`).emit('seatUpdated', data);
});
```

**5. Prevent Double Booking (Distributed Lock):**
```javascript
import Redlock from 'redlock';

const redlock = new Redlock([redis1, redis2, redis3]);

export const selectSeat = async (seatId, userId) => {
  const lock = await redlock.lock(`seat:${seatId}`, 5000);
  
  try {
    const seat = await Seat.findOne({ _id: seatId, status: 'AVAILABLE' });
    
    if (!seat) {
      throw new Error('Seat not available');
    }
    
    seat.status = 'HELD';
    seat.userId = userId;
    await seat.save();
    
    return seat;
  } finally {
    await lock.unlock();
  }
};
```

**6. Database Design:**

**Theaters Collection:**
```javascript
{
  _id: ObjectId,
  name: 'AMC Theater NY',
  location: { type: 'Point', coordinates: [-73.935242, 40.730610] },
  screens: 15,
  timezone: 'America/New_York',
  region: 'us-east'
}
```

**Showtimes:**
```javascript
{
  _id: ObjectId,
  theaterId: ObjectId,  // Shard key
  movieId: ObjectId,
  screenNumber: 5,
  startTime: ISODate,
  seatsAvailable: 150  // Denormalized for quick filtering
}
```

**Seats (Partitioned by ShowtimeID):**
```javascript
{
  _id: ObjectId,
  showtimeId: ObjectId,  // Partition key
  seatNumber: 'A1',
  status: 'AVAILABLE',
  price: 15.00
}
```

**7. Scaling Numbers:**
```
100 theaters × 10 screens × 5 showtimes/day = 5,000 showtimes/day
Each showtime: 150 seats = 750,000 seats/day
Peak time (7-9 PM): 60% of daily bookings = 450,000 seats in 2 hours
= 62 bookings/second at peak

Capacity Planning:
- 10 application servers (6,000 req/sec each)
- 5 MongoDB shards (read replicas per shard)
- Redis cluster: 50,000 ops/sec
- Load balancer: 100,000 req/sec
```

**8. Monitoring:**
- Prometheus + Grafana for metrics
- ELK stack for log aggregation
- Sentry for error tracking
- PagerDuty for alerts

**9. Disaster Recovery:**
- Multi-region deployment (US-East, US-West, EU)
- Cross-region replication
- Automated failover
- Daily backups to S3

**10. Cost Optimization:**
- Serverless for notification service (AWS Lambda)
- Reserved instances for predictable load
- Auto-scaling for peak hours
- CDN for static assets"

---

### **Q32: How would you design a system to prevent scalpers from bulk-buying tickets?**

**Answer:**
"Multi-layered bot detection and fairness system:

**1. Rate Limiting (Per User + Per IP):**
```javascript
// Aggressive rate limiting
const bookingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 3,  // Only 3 booking attempts per 5 minutes
  keyGenerator: (req) => {
    // Combine user ID and IP
    return `${req.user?.id || 'anonymous'}-${req.ip}`;
  }
});

router.post('/bookings', bookingLimiter, createBooking);
```

**2. CAPTCHA for Suspicious Activity:**
```javascript
import { verifyCaptcha } from './captchaService';

export const createBooking = async (req, res) => {
  // Calculate suspicion score
  const score = await getSuspicionScore(req);
  
  if (score > 0.7) {
    const captchaValid = await verifyCaptcha(req.body.captchaToken);
    if (!captchaValid) {
      return res.status(403).json({ message: 'Captcha verification failed' });
    }
  }
  
  // Proceed with booking...
};

const getSuspicionScore = async (req) => {
  let score = 0;
  
  // Fast clicking (< 2 seconds between seat selections)
  const lastBooking = await Booking.findOne({ userId: req.user.id })
    .sort({ createdAt: -1 });
  
  if (lastBooking && Date.now() - lastBooking.createdAt < 2000) {
    score += 0.5;
  }
  
  // Multiple bookings from same IP
  const ipBookings = await Booking.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    // If tracking IP
  });
  
  if (ipBookings > 5) {
    score += 0.3;
  }
  
  // New account (< 1 day old)
  const user = await User.findById(req.user.id);
  if (Date.now() - user.createdAt < 24 * 60 * 60 * 1000) {
    score += 0.2;
  }
  
  return Math.min(score, 1);
};
```

**3. Limit Tickets Per User:**
```javascript
// Maximum 6 seats per showtime
const existingBooking = await Booking.findOne({
  userId: req.user.id,
  showtimeId: req.body.showtimeId
});

if (existingBooking) {
  return res.status(400).json({ 
    message: 'You already have a booking for this showtime' 
  });
}

if (req.body.seatIds.length > 6) {
  return res.status(400).json({ 
    message: 'Maximum 6 tickets per booking' 
  });
}
```

**4. Verified Accounts Only:**
```javascript
// Require phone verification for new accounts
const user = await User.findById(req.user.id);

if (!user.phoneVerified) {
  return res.status(403).json({ 
    message: 'Phone verification required to book tickets',
    requiresVerification: true
  });
}
```

**5. Payment Method Verification:**
```javascript
// Require 3D Secure for new cards
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalCost * 100,
  currency: 'usd',
  payment_method_options: {
    card: {
      request_three_d_secure: 'automatic'  // Challenges suspicious payments
    }
  }
});
```

**6. Machine Learning Bot Detection:**
```javascript
// Track user behavior patterns
const behaviorSchema = new Schema({
  userId: ObjectId,
  sessionId: String,
  actions: [{
    type: String,  // 'page_view', 'seat_click', 'booking_submit'
    timestamp: Date,
    duration: Number  // Time spent on action
  }],
  mouse Movements: Number,  // Track mouse activity
  keystrokes: Number
});

// Train model on known bot patterns
const botScore = await mlModel.predict(userBehavior);

if (botScore > 0.85) {
  // Flag for manual review
  await FlaggedUser.create({ userId, reason: 'bot-like-behavior', score: botScore });
}
```

**7. Staggered Release:**
```javascript
// Release tickets in waves
const userTier = await getUserTier(req.user.id);

const releaseTime = {
  'premium': showtime.releaseTime,  // Premium users: Immediate access
  'verified': new Date(showtime.releaseTime.getTime() + 5 * 60 * 1000),  // +5 min
  'new': new Date(showtime.releaseTime.getTime() + 15 * 60 * 1000)  // +15 min
};

if (Date.now() < releaseTime[userTier]) {
  return res.status(403).json({ 
    message: 'Tickets not yet available',
    availableAt: releaseTime[userTier]
  });
}
```

**8. Detect Multiple Accounts:**
```javascript
// Flag if multiple accounts from same device
const deviceFingerprint = req.headers['x-device-fingerprint'];

const recentAccounts = await User.countDocuments({
  deviceFingerprint,
  createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
});

if (recentAccounts > 3) {
  // Require additional verification
  requireAdditionalVerification = true;
}
```

**9. Waiting Room for High-Demand Shows:**
```javascript
// Implement virtual queue
const QueueSchema = new Schema({
  userId: ObjectId,
  showtimeId: ObjectId,
  joinedAt: Date,
  position: Number,
  accessToken: String,  // Unique token to enter booking page
  expiresAt: Date
});

// User joins queue
const queueEntry = await Queue.create({
  userId: req.user.id,
  showtimeId,
  joinedAt: new Date(),
  position: await Queue.countDocuments({ showtimeId }) + 1
});

// Admit users gradually (100 per minute)
cron.schedule('* * * * *', async () => {
  const toAdmit = await Queue.find({ 
    accessToken: null 
  })
  .sort({ joinedAt: 1 })
  .limit(100);
  
  for (const entry of toAdmit) {
    entry.accessToken = uuidv4();
    entry.expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // 10 min window
    await entry.save();
    
    // Notify user
    io.to(`user-${entry.userId}`).emit('booking-access', { accessToken: entry.accessToken });
  }
});
```

**10. Analytics & Monitoring:**
```javascript
// Real-time dashboard
- Booking velocity (should be steady, not burst)
- Failed payment rate (bots often have fake cards)
- Seat hold duration (humans take time to decide, bots are instant)
- Session duration (bots have very short sessions)

// Alert on anomalies
if (bookings.last60Seconds > 50) {
  sendAlert('Potential bot attack - booking spike detected');
  enableStrictMode();  // Auto-enable captcha for all users
}
```

**11. Legal Deterrent:**
```javascript
// Terms of Service
- Prohibit automated booking
- Right to cancel bot bookings
- Ban accounts engaging in scalping

// Watermark tickets with buyer info
- Name, email, booking timestamp
- QR code with encrypted buyer details
- Prevents resale (or makes it traceable)
```

**Result:**
- Legitimate users: Minimal friction
- Bots: Multiple barriers, high detection rate
- Scalpers: Economic disincentive (captchas slow them down, limits reduce profit)"

---

*(Continue with Q33-Q40 covering microservices migration, search implementation, recommendation system, mobile app API design, handling payment failures, video streaming integration, social features, and A/B testing)*

---

## 🎓 Behavioral Questions

### **Q41: Tell me about a challenging bug you encountered.**

"The most challenging bug was intermittent seat double-booking that only occurred under high load.

**Problem:** During testing with 50+ concurrent users, occasionally two users would successfully book the same seat.

**Investigation:**
1. Checked MongoDB logs - no errors
2. Reviewed code - atomic operations were used
3. Realized the issue: race condition in the booking flow

**Root Cause:**
```javascript
// Original flawed code
const seat = await Seat.findOne({ _id: seatId, status: 'AVAILABLE' });
// ⚠️ Another request could check here!
if (seat) {
  seat.status = 'HELD';
  await seat.save();
}
```

Between the find and save, another request could complete the same check.

**Solution:**
```javascript
// Fixed with atomic operation
const seat = await Seat.findOneAndUpdate(
  { _id: seatId, status: 'AVAILABLE' },
  { status: 'HELD', userId },
  { new: true }
);

if (!seat) {
  throw new Error('Seat not available');
}
```

**Testing:** Set up stress test with 100 concurrent seat selections. Zero double bookings after fix.

**Learning:** Always use atomic operations for concurrent writes. Testing under load is essential."

---

### **Q42: How do you prioritize features when you have limited time?**

"I use the Impact-Effort matrix:

**High Impact, Low Effort (Do First):**
- Stripe payment integration (critical, well-documented)
- Basic seat selection (core feature)

**High Impact, High Effort (Schedule Carefully):**
- Real-time Socket.IO updates (important but complex)
- Admin dashboard with analytics

**Low Impact, Low Effort (Fill Gaps):**
- Dark mode toggle
- Sort movies by rating

**Low Impact, High Effort (Deferred):**
- AI-powered movie recommendations
- Social features (watch with friends)

For this project, I focused on completing the core booking flow (browse → select → pay → confirm) before adding enhancements like Google OAuth and parking."

---

## 📝 Code Walkthroughs

*(Include 3-4 detailed code walkthroughs of key features like booking flow, real-time updates, authentication, and payment processing)*

---

## 🏛️ Architecture Explanations

**"Explain your architecture to a non-technical person"**

"Imagine a cinema booking app as a restaurant:

**Frontend (React)**: The dining room where customers interact - see the menu (movies), choose seats (tables), and place orders (bookings).

**Backend (Express)**: The kitchen where chefs (controllers) prepare meals (process requests), following recipes (business logic), and getting ingredients (database queries).

**Database (MongoDB)**: The pantry storing all ingredients (data) - user accounts, movie info, seat availability.

**Socket.IO**: Walkie-talkies between dining room and kitchen for instant updates - if a table is taken, everyone sees it immediately.

**Stripe**: The payment terminal - securely processes credit cards without us ever seeing the card details.

**Authentication (JWT)**: Your reservation confirmation - proves you're a valid customer and gets you into the restaurant.

Everything works together to give customers a smooth experience from browsing movies to watching them."

---

## ⚖️ Trade-offs & Decisions

### **"Why JWT vs Sessions?"**

**JWT (Chosen):**
- ✅ Stateless (no database lookup per request)
- ✅ Works across multiple servers (horizontal scaling)
- ✅ Mobile-friendly (send token in header)
- ❌ Can't revoke (until expiry)
- ❌ Larger payload (sent with every request)

**Sessions:**
- ✅ Can revoke instantly
- ✅ Smaller payload (just session ID)
- ❌ Requires database/Redis lookup per request
- ❌ Complex in distributed systems

**Decision:** JWT for scalability, with plans to add JTI in Redis for revocation when needed.

---

### **"MongoDB vs PostgreSQL?"**

**MongoDB (Chosen):**
- ✅ Flexible schema (movies have varying metadata)
- ✅ Easy horizontal scaling
- ✅ JavaScript everywhere (JSON)
- ❌ Weaker transaction support

**PostgreSQL:**
- ✅ Strong ACID guarantees
- ✅ Complex joins
- ❌ Schema changes require migrations

**Decision:** MongoDB for this project due to flexible schema and scaling advantages. Would reconsider for financial systems requiring complex transactions.

---

**Next:** [END_TO_END_FLOW.md](./END_TO_END_FLOW.md)
