# 🔄 END-TO-END FLOW DOCUMENTATION

## 📋 Table of Contents
1. [Complete User Journey](#complete-user-journey)
2. [Signup & Authentication Flow](#signup--authentication-flow)
3. [Movie Browsing Flow](#movie-browsing-flow)
4. [Seat Selection Flow](#seat-selection-flow)
5. [Payment & Booking Flow](#payment--booking-flow)
6. [Admin Operations Flow](#admin-operations-flow)
7. [Real-Time Update Flow](#real-time-update-flow)
8. [Error Handling Flow](#error-handling-flow)

---

## 🎬 Complete User Journey

### **High-Level Overview**

```
User Opens App → Browses Movies → Selects Movie → Chooses Showtime →
Selects Seats → Adds Parking → Makes Payment → Receives Confirmation →
Gets Email → Shows Ticket at Theater
```

### **System Components Involved**

```
Browser → React App → Redux → Axios → Express Backend →
Mongoose → MongoDB → Socket.IO → Stripe → Nodemailer
```

---

## 🔐 Signup & Authentication Flow

### **Step-by-Step Breakdown**

#### **1. User Visits Signup Page**

**Frontend (SignUp.jsx):**
```javascript
// User fills form
<input type="email" onChange={(e) => setEmail(e.target.value)} />
<input type="password" onChange={(e) => setPassword(e.target.value)} />
<button onClick={handleSubmit}>Sign Up</button>
```

**What Happens:**
- React controlled components capture user input
- State updates with each keystroke: `setEmail()`, `setPassword()`
- Form validation (client-side): checks email format, password length

---

#### **2. User Clicks "Sign Up"**

**Frontend:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // 1. Dispatch Redux action (loading state)
  dispatch(signUpStart());
  
  try {
    // 2. HTTP POST request
    const response = await axios.post('/api/auth/signup', {
      username,
      email,
      password
    });
    
    // 3. Success - update Redux
    dispatch(signUpSuccess(response.data));
    
    // 4. Navigate to home
    navigate('/');
    
  } catch (error) {
    // 5. Failure - show error
    dispatch(signUpFailure(error.response.data.message));
  }
};
```

**Redux State Changes:**
```javascript
// Before click
{ user: { currentUser: null, loading: false, error: null } }

// After dispatch(signUpStart())
{ user: { currentUser: null, loading: true, error: null } }

// After success
{ user: { currentUser: { username: 'john', email: '...', role: 'user' }, loading: false, error: null } }
```

---

#### **3. Request Reaches Backend**

**Network Layer:**
```
Browser → DNS Lookup (Vercel) → Vercel Edge → Reverse Proxy →
DNS Lookup (Render) → Render Load Balancer → Express Server
```

**Express Middleware Chain:**
```javascript
// 1. CORS Middleware
app.use(cors({ origin: 'https://www.cinexp.app', credentials: true }));
// Checks origin, adds CORS headers

// 2. Helmet (Security headers)
app.use(helmet());
// Adds X-Content-Type-Options, X-Frame-Options

// 3. Body Parser
app.use(express.json());
// Parses JSON body: { username, email, password }

// 4. Cookie Parser
app.use(cookieParser());

// 5. Route Handler
app.use('/api/auth', authRouter);
// Matches /api/auth/signup

// 6. Controller
router.post('/signup', signup);
```

---

#### **4. Controller Processes Request**

**auth.controller.js:**
```javascript
export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // STEP 1: Validate input
    if (!username || !email || !password) {
      return next(errorHandler(400, 'All fields required'));
    }
    
    // STEP 2: Check if user exists
    const existingUser = await User.findOne({ email });
    // MongoDB query: db.users.findOne({ email: "..." })
    
    if (existingUser) {
      return next(errorHandler(400, 'Email already exists'));
    }
    
    // STEP 3: Hash password
    const hashedPassword = bcryptjs.hashSync(password, 10);
    // Computation: ~100-200ms
    // Result: "$2a$10$abc123xyz..." (60 characters)
    
    // STEP 4: Create user document
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'user',  // Default role
      isActive: true,
      createdAt: new Date()
    });
    
    // MongoDB operation:
    // db.users.insertOne({...})
    // Result: { _id: ObjectId("..."), username: "john", ... }
    
    // STEP 5: Generate JWT token
    const token = jwt.sign(
      { id: newUser._id },  // Payload
      process.env.JWT_SECRET,  // Secret key
      { expiresIn: '7d' }  // Expiry
    );
    // Result: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    // STEP 6: Set cookie
    res.cookie('access_token', token, {
      httpOnly: true,     // JavaScript can't access
      secure: true,       // HTTPS only
      sameSite: 'none',   // Cross-origin allowed
      maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
    });
    
    // STEP 7: Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser.toObject();
    
    res.status(201).json(userWithoutPassword);
    
  } catch (error) {
    next(error);  // Error handler middleware
  }
};
```

**Database Operations:**
```
MongoDB Query Plan:
1. Index scan on email field (4ms)
2. Document insertion (8ms)
3. Index update (2ms)
Total: ~14ms
```

---

#### **5. Response Returns to Frontend**

**HTTP Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json
Set-Cookie: access_token=eyJhbGci...; HttpOnly; Secure; SameSite=None; Max-Age=604800

{
  "_id": "507f1f77bcf86cd799439011",
  "username": "john",
  "email": "john@example.com",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

#### **6. Frontend Updates**

**Redux State Update:**
```javascript
// Redux reducer
signUpSuccess: (state, action) => {
  state.currentUser = action.payload;
  state.loading = false;
  state.error = null;
}
```

**Redux Persist:**
```javascript
// Automatically saves to localStorage
localStorage.setItem('persist:root', JSON.stringify({
  user: {
    currentUser: { username: 'john', ... },
    loading: false,
    error: null
  }
}));
```

**Component Re-renders:**
```javascript
// Header.jsx listens to Redux
const { currentUser } = useSelector(state => state.user);

// Conditional rendering
{currentUser ? (
  <div>Welcome, {currentUser.username}</div>
) : (
  <Link to="/sign-in">Sign In</Link>
)}
```

---

### **Google OAuth Alternative Flow**

#### **1. User Clicks "Sign in with Google"**

**Frontend:**
```javascript
import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';

const handleGoogleSignIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const auth = getAuth(app);
    
    // Opens Google popup
    const result = await signInWithPopup(auth, provider);
    
    // Extract user info
    const { displayName, email, photoURL } = result.user;
    
    // Send to our backend
    const response = await axios.post('/api/auth/google', {
      username: displayName,
      email,
      profilePicture: photoURL
    });
    
    dispatch(signInSuccess(response.data));
  } catch (error) {
    dispatch(signInFailure(error.message));
  }
};
```

---

#### **2. Firebase Handles OAuth**

**What Happens:**
1. User clicks button
2. Firebase opens Google OAuth popup
3. User logs into Google
4. Google returns user data to Firebase
5. Firebase returns data to our app
6. Our app sends to our backend

---

#### **3. Backend Processes OAuth**

**google.controller.js:**
```javascript
export const google = async (req, res, next) => {
  try {
    const { email, username, profilePicture } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      // Existing user - just login
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      
      res.cookie('access_token', token, { httpOnly: true, secure: true });
      res.json(user);
      
    } else {
      // New user - create account
      const generatedPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
      
      user = await User.create({
        username: username || email.split('@')[0],
        email,
        password: hashedPassword,
        profilePicture,
        isOAuthUser: true  // Flag for OAuth users
      });
      
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      
      res.cookie('access_token', token, { httpOnly: true, secure: true });
      res.status(201).json(user);
    }
  } catch (error) {
    next(error);
  }
};
```

---

## 🎯 Movie Browsing Flow

### **1. User Lands on Homepage**

**App Component Mount:**
```javascript
// App.jsx
useEffect(() => {
  // Validate session on app load
  const validateSession = async () => {
    try {
      const response = await axios.get('/api/auth/validate-session', {
        withCredentials: true  // Includes cookie
      });
      
      dispatch(signInSuccess(response.data.user));
    } catch (error) {
      dispatch(signOut());  // Clear invalid session
    }
  };
  
  validateSession();
}, []);
```

---

### **2. Home Component Fetches Movies**

**Home.jsx:**
```javascript
const [movies, setMovies] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchMovies = async () => {
    try {
      setLoading(true);
      
      // API call
      const response = await axios.get('/api/movies');
      
      // Update state
      setMovies(response.data);
      
    } catch (error) {
      console.error('Failed to fetch movies:', error);
      Swal.fire('Error', 'Could not load movies', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  fetchMovies();
}, []);
```

---

### **3. Backend Fetches from Database**

**movie.controller.js:**
```javascript
export const getMovies = async (req, res, next) => {
  try {
    // Query with filters
    const { genre, search, status } = req.query;
    
    let filter = {};
    
    if (genre) {
      filter.genre = { $in: [genre] };  // Genre is array
    }
    
    if (search) {
      filter.$text = { $search: search };  // Full-text search
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Database query
    const movies = await Movie.find(filter)
      .select('-__v')  // Exclude version key
      .lean()  // Plain JS object (faster)
      .sort({ releaseDate: -1 });  // Newest first
    
    // Response
    res.json(movies);
    
  } catch (error) {
    next(error);
  }
};
```

**MongoDB Query:**
```javascript
// Executed query
db.movies.find(
  { status: "Released" }
).sort({ releaseDate: -1 })

// Uses index
movies_status_1_releaseDate_-1

// Returns array of documents
[
  {
    _id: ObjectId("..."),
    title: "Inception",
    genre: ["Action", "Sci-Fi"],
    poster: "https://cloudinary.com/...",
    rating: 8.8,
    duration: 148
  },
  // ... more movies
]
```

---

### **4. Frontend Renders Movies**

**Home.jsx:**
```javascript
return (
  <div className="container">
    {loading ? (
      <LoadingSpinner />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {movies.map(movie => (
          <MovieCard key={movie._id} movie={movie} />
        ))}
      </div>
    )}
  </div>
);
```

**MovieCard Component:**
```javascript
const MovieCard = ({ movie }) => {
  const navigate = useNavigate();
  
  return (
    <div 
      className="movie-card" 
      onClick={() => navigate(`/movie/${movie._id}`)}
    >
      <img src={movie.poster} alt={movie.title} />
      <h3>{movie.title}</h3>
      <p>{movie.genre.join(', ')}</p>
      <div className="rating">⭐ {movie.rating}/10</div>
    </div>
  );
};
```

---

### **5. User Clicks Movie Card**

**Navigation Flow:**
```
onClick → navigate(`/movie/${movie._id}`) →
React Router → <Route path="/movie/:id" element={<MovieDetails />} /> →
MovieDetails component mounts →
useEffect fetches movie details + showtimes
```

**MovieDetails.jsx:**
```javascript
useEffect(() => {
  const fetchMovieDetails = async () => {
    try {
      // Fetch movie
      const movieRes = await axios.get(`/api/movies/${id}`);
      setMovie(movieRes.data);
      
      // Fetch showtimes for this movie
      const showtimesRes = await axios.get(`/api/showtimes?movieId=${id}`);
      setShowtimes(showtimesRes.data);
      
    } catch (error) {
      Swal.fire('Error', 'Could not load movie details', 'error');
    }
  };
  
  fetchMovieDetails();
}, [id]);
```

---

## 🪑 Seat Selection Flow

### **Complete Journey**

```
User clicks showtime → Navigate to seat selection page →
Socket.IO connects → Fetches seats from backend →
Displays seat grid → User clicks seat → Updates local state →
Sends seat hold request → Backend updates DB → Socket.IO broadcasts update →
All connected clients receive update → UI updates for everyone
```

---

### **1. User Selects Showtime**

**MovieDetails.jsx:**
```javascript
const handleShowtimeClick = async (showtime) => {
  // Check if showtime is bookable
  const now = new Date();
  const cutoffTime = new Date(showtime.startTime.getTime() - 15 * 60 * 1000);
  
  if (now > cutoffTime) {
    Swal.fire('Too Late', 'Booking closes 15 minutes before showtime', 'warning');
    return;
  }
  
  if (!currentUser) {
    Swal.fire('Login Required', 'Please sign in to book tickets', 'info');
    navigate('/sign-in');
    return;
  }
  
  // Navigate to seat selection
  navigate(`/movie/${movie._id}/showtime/${showtime._id}/seats`);
};
```

---

### **2. Seat Selection Page Loads**

**Tickets-new.jsx (Simplified):**
```javascript
const [seats, setSeats] = useState([]);
const [selectedSeats, setSelectedSeats] = useState([]);
const [socket, setSocket] = useState(null);

useEffect(() => {
  // 1. Connect WebSocket
  const socketConnection = io('https://cinimax.onrender.com', {
    withCredentials: true
  });
  
  setSocket(socketConnection);
  
  // 2. Join showtime room
  socketConnection.emit('joinShowtime', showtimeId);
  
  // 3. Listen for seat updates
  socketConnection.on('seatsUpdated', (updatedSeats) => {
    setSeats(prevSeats => {
      return prevSeats.map(seat => {
        const updated = updatedSeats.find(u => u._id === seat._id);
        return updated || seat;
      });
    });
  });
  
  // 4. Fetch initial seats
  const fetchSeats = async () => {
    const response = await axios.get(`/api/seats/showtime/${showtimeId}`);
    setSeats(response.data);
  };
  
  fetchSeats();
  
  // Cleanup on unmount
  return () => {
    socketConnection.emit('leaveShowtime', showtimeId);
    socketConnection.disconnect();
  };
}, [showtimeId]);
```

---

### **3. Backend Returns Seats**

**seat.controller.js:**
```javascript
export const getSeatsByShowtime = async (req, res, next) => {
  try {
    const { showtimeId } = req.params;
    
    // Fetch all seats for showtime
    const seats = await Seat.find({ showtimeId })
      .select('seatNumber category status price row column')
      .lean()
      .sort({ row: 1, column: 1 });  // Alphabetical order
    
    res.json(seats);
    
  } catch (error) {
    next(error);
  }
};
```

**MongoDB Query:**
```javascript
// Query
db.seats.find({ showtimeId: ObjectId("...") })
  .sort({ row: 1, column: 1 })

// Result (200 seats)
[
  { _id: ObjectId("..."), seatNumber: "A1", category: "Gold", status: "AVAILABLE", price: 15 },
  { _id: ObjectId("..."), seatNumber: "A2", category: "Gold", status: "HELD", price: 15 },
  { _id: ObjectId("..."), seatNumber: "A3", category: "Gold", status: "SOLD", price: 15 },
  // ... 197 more
]
```

---

### **4. User Clicks Seat**

**Frontend:**
```javascript
const handleSeatClick = async (seat) => {
  // Prevent selecting unavailable seats
  if (seat.status !== 'AVAILABLE') {
    Swal.fire('Unavailable', 'This seat is already taken', 'error');
    return;
  }
  
  // Optimistic UI update
  setSelectedSeats([...selectedSeats, seat]);
  
  // Send hold request
  try {
    socket.emit('holdSeat', {
      seatId: seat._id,
      userId: currentUser.id,
      showtimeId
    });
  } catch (error) {
    // Revert optimistic update
    setSelectedSeats(selectedSeats.filter(s => s._id !== seat._id));
    Swal.fire('Error', 'Could not select seat', 'error');
  }
};
```

---

### **5. Backend Processes Seat Hold**

**Socket.IO Handler (api/index.js):**
```javascript
io.on('connection', (socket) => {
  socket.on('joinShowtime', (showtimeId) => {
    socket.join(`showtime-${showtimeId}`);
    console.log(`User joined showtime room: ${showtimeId}`);
  });
  
  socket.on('holdSeat', async (data) => {
    const { seatId, userId, showtimeId } = data;
    
    try {
      // Atomic update
      const seat = await Seat.findOneAndUpdate(
        { 
          _id: seatId, 
          status: 'AVAILABLE'  // Only if still available
        },
        {
          status: 'HELD',
          userId: userId,
          holdUntil: new Date(Date.now() + 10 * 60 * 1000)  // 10 min hold
        },
        { new: true }
      );
      
      if (!seat) {
        // Seat was taken by someone else
        socket.emit('seatHoldFailed', {
          seatId,
          message: 'Seat no longer available'
        });
        return;
      }
      
      // Broadcast to all users in this showtime
      io.to(`showtime-${showtimeId}`).emit('seatsUpdated', [seat]);
      
      console.log(`Seat ${seat.seatNumber} held by user ${userId}`);
      
    } catch (error) {
      socket.emit('error', { message: 'Failed to hold seat' });
    }
  });
  
  socket.on('releaseSeat', async (data) => {
    // Similar logic for releasing seat
  });
});
```

---

### **6. All Connected Clients Receive Update**

**Frontend (All Users):**
```javascript
socketConnection.on('seatsUpdated', (updatedSeats) => {
  console.log('Received seat updates:', updatedSeats);
  
  // Update local state
  setSeats(prevSeats => 
    prevSeats.map(seat => {
      const updated = updatedSeats.find(u => u._id === seat._id);
      return updated || seat;
    })
  );
  
  // Visual feedback
  updatedSeats.forEach(seat => {
    const seatElement = document.querySelector(`[data-seat-id="${seat._id}"]`);
    if (seatElement) {
      seatElement.classList.add('flash-animation');
      setTimeout(() => seatElement.classList.remove('flash-animation'), 500);
    }
  });
});
```

---

### **7. Seat Display Updates**

**Seat Grid Rendering:**
```javascript
const SeatGrid = () => {
  return (
    <div className="seat-grid">
      {seats.map(seat => (
        <button
          key={seat._id}
          data-seat-id={seat._id}
          className={`seat ${seat.status.toLowerCase()} ${seat.category}`}
          onClick={() => handleSeatClick(seat)}
          disabled={seat.status !== 'AVAILABLE'}
        >
          {seat.seatNumber}
        </button>
      ))}
    </div>
  );
};
```

**CSS:**
```css
.seat.available { background: #4ade80; cursor: pointer; }
.seat.held { background: #fbbf24; cursor: not-allowed; }
.seat.sold { background: #ef4444; cursor: not-allowed; }

.flash-animation {
  animation: flash 0.5s;
}

@keyframes flash {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); background: yellow; }
}
```

---

## 💳 Payment & Booking Flow

### **1. User Clicks "Proceed to Payment"**

**Frontend Validation:**
```javascript
const handleProceedToPayment = () => {
  if (selectedSeats.length === 0) {
    Swal.fire('No Seats', 'Please select at least one seat', 'warning');
    return;
  }
  
  // Calculate total
  const totalCost = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  
  // Navigate to payment page
  navigate('/payment', {
    state: {
      movieId,
      showtimeId,
      seatIds: selectedSeats.map(s => s._id),
      totalCost
    }
  });
};
```

---

### **2. Payment Page Loads Stripe**

**PaymentPage.jsx:**
```javascript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PaymentPage = () => {
  const location = useLocation();
  const { movieId, showtimeId, seatIds, totalCost } = location.state;
  
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm 
        movieId={movieId}
        showtimeId={showtimeId}
        seatIds={seatIds}
        totalCost={totalCost}
      />
    </Elements>
  );
};
```

---

### **3. User Enters Card Details**

**PaymentForm.jsx:**
```javascript
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

const PaymentForm = ({ movieId, showtimeId, seatIds, totalCost }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { currentUser } = useSelector(state => state.user);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    try {
      // STEP 1: Create payment intent on backend
      const { data } = await axios.post('/api/stripe/create-payment-intent', {
        amount: totalCost,
        bookingData: {
          userId: currentUser._id,
          movieId,
          showtimeId,
          seatIds
        }
      });
      
      const { clientSecret } = data;
      
      // STEP 2: Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: currentUser.username,
              email: currentUser.email
            }
          }
        }
      );
      
      if (error) {
        Swal.fire('Payment Failed', error.message, 'error');
        return;
      }
      
      if (paymentIntent.status === 'succeeded') {
        // STEP 3: Confirm booking on backend
        const bookingResponse = await axios.post('/api/bookings/confirm', {
          paymentIntentId: paymentIntent.id,
          ...data.bookingData
        });
        
        Swal.fire('Success', 'Booking confirmed!', 'success');
        navigate(`/booking-confirmation/${bookingResponse.data._id}`);
      }
      
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Booking failed', 'error');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement options={{
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': { color: '#aab7c4' }
          }
        }
      }} />
      <button type="submit" disabled={!stripe}>
        Pay ${totalCost}
      </button>
    </form>
  );
};
```

---

### **4. Backend Creates Payment Intent**

**stripe.controller.js:**
```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, bookingData } = req.body;
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),  // Convert to cents
      currency: 'usd',
      metadata: {
        userId: bookingData.userId,
        movieId: bookingData.movieId,
        showtimeId: bookingData.showtimeId
      }
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      bookingData
    });
    
  } catch (error) {
    next(error);
  }
};
```

---

### **5. User Submits Payment**

**What Happens:**
1. Stripe.js securely collects card details
2. Frontend calls `stripe.confirmCardPayment()`
3. Stripe validates card
4. Stripe processes payment
5. Returns payment intent with status
6. Frontend calls backend to confirm booking

---

### **6. Backend Confirms Booking**

**booking.controller.js:**
```javascript
export const confirmBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { paymentIntentId, userId, movieId, showtimeId, seatIds } = req.body;
    
    // STEP 1: Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not completed');
    }
    
    // STEP 2: Verify seats still held by this user
    const seats = await Seat.find({
      _id: { $in: seatIds },
      userId: userId,
      status: 'HELD'
    }).session(session);
    
    if (seats.length !== seatIds.length) {
      // Refund payment
      await stripe.refunds.create({ payment_intent: paymentIntentId });
      throw new Error('Some seats are no longer available');
    }
    
    // STEP 3: Generate booking reference
    const bookingReference = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // STEP 4: Create booking
    const booking = await Booking.create([{
      userId,
      movieId,
      showtimeId,
      seatIds,
      totalCost: paymentIntent.amount / 100,
      paymentStatus: 'COMPLETED',
      paymentIntentId,
      bookingReference,
      createdAt: new Date()
    }], { session });
    
    // STEP 5: Update seats to SOLD
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { 
        status: 'SOLD',
        $unset: { holdUntil: 1 }  // Remove hold timestamp
      },
      { session }
    );
    
    // STEP 6: Commit transaction
    await session.commitTransaction();
    
    // STEP 7: Send confirmation email (async, outside transaction)
    sendBookingConfirmation(booking[0]);
    
    // STEP 8: Broadcast update via Socket.IO
    const io = req.app.get('io');
    io.to(`showtime-${showtimeId}`).emit('seatsUpdated', seats.map(s => ({
      ...s.toObject(),
      status: 'SOLD'
    })));
    
    res.json(booking[0]);
    
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
```

---

### **7. Email Confirmation Sent**

**emailService.js:**
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

export const sendBookingConfirmation = async (booking) => {
  try {
    // Fetch full booking details
    const fullBooking = await Booking.findById(booking._id)
      .populate('userId', 'username email')
      .populate('movieId', 'title poster duration')
      .populate('showtimeId', 'startTime screen')
      .populate('seatIds', 'seatNumber');
    
    const emailHTML = `
      <h1>Booking Confirmed!</h1>
      <p>Hi ${fullBooking.userId.username},</p>
      <p>Your booking for <strong>${fullBooking.movieId.title}</strong> has been confirmed.</p>
      
      <h3>Booking Details:</h3>
      <ul>
        <li>Booking Reference: ${fullBooking.bookingReference}</li>
        <li>Movie: ${fullBooking.movieId.title}</li>
        <li>Showtime: ${new Date(fullBooking.showtimeId.startTime).toLocaleString()}</li>
        <li>Screen: ${fullBooking.showtimeId.screen}</li>
        <li>Seats: ${fullBooking.seatIds.map(s => s.seatNumber).join(', ')}</li>
        <li>Total: $${fullBooking.totalCost}</li>
      </ul>
      
      <p>Show this email at the theater entrance.</p>
      <p>Thank you for choosing CinematicPopcornPark!</p>
    `;
    
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: fullBooking.userId.email,
      subject: `Booking Confirmed - ${fullBooking.bookingReference}`,
      html: emailHTML
    });
    
    console.log(`Confirmation email sent to ${fullBooking.userId.email}`);
    
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw - booking already completed
  }
};
```

---

## 🎓 Interview Talking Points

**"Walk me through what happens when a user books a ticket"**

"When a user clicks 'Proceed to Payment':

1. **Frontend validates** selected seats, calculates total
2. **Navigates to payment page** with booking data
3. **Stripe.js loads** securely in iframe
4. User enters card → **Stripe validates** (never touches our server)
5. Frontend requests **payment intent** from backend
6. Backend calls **Stripe API**, returns client secret
7. Frontend **confirms payment** with Stripe
8. Stripe processes → returns **payment intent with status**
9. Frontend sends **payment intent ID** to backend
10. Backend starts **MongoDB transaction**:
    - Verifies payment with Stripe
    - Checks seats still held by user  
    - Creates booking document
    - Updates seats to SOLD
    - Commits transaction
11. Backend sends **confirmation** email asynchronously
12. **Socket.IO broadcasts** updated seats to all connected users
13. Frontend navigates to **confirmation page**
14. **Redux persists** booking in localStorage

This ensures strong consistency - either everything succeeds (payment + booking + seat update) or everything rolls back."

---

**Next:** [VISUAL_MEMORY_MAP.md](./VISUAL_MEMORY_MAP.md)
