# 🏗️ SYSTEM ARCHITECTURE

## 📋 Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Logical Architecture Flow](#logical-architecture-flow)
3. [Technology Stack Deep Dive](#technology-stack-deep-dive)
4. [Request-Response Lifecycle](#request-response-lifecycle)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Real-Time Communication Architecture](#real-time-communication-architecture)
7. [Security Architecture](#security-architecture)
8. [Scalability Considerations](#scalability-considerations)

---

## 🎯 High-Level Architecture

### **Three-Tier Architecture**

```
┌───────────────────────────────────────────────────────────┐
│                    CLIENT TIER                             │
│                   (Presentation)                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │   React Application (Port 5173 in dev)              │  │
│  │   - Components (UI)                                 │  │
│  │   - Redux Store (State Management)                  │  │
│  │   - React Router (Navigation)                       │  │
│  │   - Socket.IO Client (Real-time)                    │  │
│  │   - Axios (HTTP Client)                             │  │
│  │                                                       │  │
│  │   Deployed on: Vercel                               │  │
│  │   URL: https://www.cinexp.app                       │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
                          ↕ HTTPS / WebSocket
┌───────────────────────────────────────────────────────────┐
│                    SERVER TIER                             │
│                  (Business Logic)                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │   Node.js + Express (Port 5000)                     │  │
│  │   - RESTful API Routes                              │  │
│  │   - Controllers (Business Logic)                    │  │
│  │   - Middleware (Auth, Validation)                   │  │
│  │   - Socket.IO Server (Real-time)                    │  │
│  │   - Cron Jobs (Scheduled Tasks)                     │  │
│  │   - Services (Email, Stripe, Cloudinary)            │  │
│  │                                                       │  │
│  │   Deployed on: Render                               │  │
│  │   URL: https://cinimax.onrender.com                 │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
                          ↕ MongoDB Protocol
┌───────────────────────────────────────────────────────────┐
│                    DATABASE TIER                           │
│                    (Data Storage)                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │   MongoDB Atlas (Cloud)                             │  │
│  │   - NoSQL Document Database                         │  │
│  │   - Collections (Users, Movies, Bookings, etc.)     │  │
│  │   - Indexes for Query Optimization                  │  │
│  │   - Automatic Backups                               │  │
│  │                                                       │  │
│  │   Hosted on: MongoDB Atlas                          │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### **External Services Integration**

```
                    ┌─────────────────┐
                    │   CLIENT TIER   │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            ↓                ↓                ↓
    ┌───────────┐    ┌──────────┐    ┌──────────┐
    │  Firebase │    │  Stripe  │    │  Server  │
    │   OAuth   │    │  Payment │    │   API    │
    │  (Google) │    │          │    │          │
    └───────────┘    └──────────┘    └─────┬────┘
                                            │
                    ┌───────────────────────┼───────────────┐
                    ↓                       ↓               ↓
            ┌───────────┐          ┌────────────┐  ┌───────────┐
            │ Cloudinary│          │  Nodemailer│  │  MongoDB  │
            │   Image   │          │   Email    │  │  Database │
            │  Storage  │          │  Service   │  │           │
            └───────────┘          └────────────┘  └───────────┘
```

---

## 🔄 Logical Architecture Flow

### **Client to Server to Database Flow**

#### **Step-by-Step Flow for a Typical Booking Request**

```
1. USER INTERACTION
   ↓
   User clicks "Book Seats" button on UI
   ↓
2. FRONTEND (React)
   ↓
   Component dispatches Redux action
   ↓
   Redux Thunk makes API call via Axios
   ↓
   HTTP POST request sent to backend
   ↓
3. NETWORK LAYER
   ↓
   Request travels over HTTPS
   ↓
   CORS middleware validates origin
   ↓
4. BACKEND - MIDDLEWARE
   ↓
   Express receives request
   ↓
   Morgan logs the request
   ↓
   CORS checks origin
   ↓
   Body Parser parses JSON
   ↓
   Cookie Parser extracts cookies
   ↓
   Auth Middleware verifies JWT token
   ↓
   Validation Middleware checks input
   ↓
5. BACKEND - ROUTE HANDLER
   ↓
   Route matches /api/bookings
   ↓
   Calls corresponding controller method
   ↓
6. BACKEND - CONTROLLER
   ↓
   Business logic execution
   ↓
   Starts MongoDB transaction
   ↓
   Validates showtime availability
   ↓
   Checks seat availability
   ↓
   Updates seat status to SOLD
   ↓
   Creates booking document
   ↓
   Processes payment (Stripe)
   ↓
   Commits transaction
   ↓
   Sends email confirmation (Nodemailer)
   ↓
   Emits Socket.IO event for real-time update
   ↓
7. DATABASE (MongoDB)
   ↓
   Mongoose ODM validates schema
   ↓
   Document saved to collection
   ↓
   Returns saved document with _id
   ↓
8. BACKEND - RESPONSE
   ↓
   Controller formats response
   ↓
   JSON response sent to client
   ↓
9. FRONTEND - UPDATE
   ↓
   Axios receives response
   ↓
   Redux updates state
   ↓
   React re-renders components
   ↓
   User sees confirmation message
   ↓
   Socket.IO updates all connected clients
   ↓
10. COMPLETE ✓
```

---

## 🛠️ Technology Stack Deep Dive

### **Frontend Framework: React 18**

**Why React?**
- Component-based architecture for reusability
- Virtual DOM for performance
- Large ecosystem and community
- Easy state management integration
- JSX for intuitive UI development

**Key React Concepts Used:**
- Functional Components
- React Hooks (useState, useEffect, useContext, useMemo, useCallback)
- Custom Hooks for reusable logic
- Context API for theme/global state
- Lazy Loading for code splitting
- Suspense for loading states

### **Backend Framework: Express.js + Node.js**

**Why Express?**
- Minimalist and flexible
- Robust routing system
- Extensive middleware ecosystem
- Great for RESTful APIs
- Non-blocking I/O (Node.js advantage)

**Express Architecture:**
```javascript
// Server initialization flow
app = express()
    ↓
Middleware Stack (order matters!)
    ↓
1. CORS
2. Body Parser
3. Cookie Parser
4. Morgan (Logging)
5. Helmet (Security)
    ↓
Routes Registration
    ↓
Error Handling Middleware
    ↓
HTTP Server Creation
    ↓
Socket.IO Attachment
    ↓
Listen on Port 5000
```

### **Database: MongoDB (NoSQL)**

**Why MongoDB?**
- Flexible schema for rapid development
- JSON-like documents match JavaScript objects
- Horizontal scalability
- Rich query language
- Great for real-time applications
- Embedded documents reduce joins

**MongoDB vs SQL for this project:**

| Feature | MongoDB (Chosen) | SQL |
|---------|------------------|-----|
| Schema | Flexible | Rigid |
| Relationships | Embedded + References | Foreign Keys |
| Scalability | Horizontal | Vertical (primarily) |
| Development Speed | Fast | Moderate |
| Complex Queries | Good | Excellent |
| Learning Curve | Moderate | Moderate |

**When SQL might be better:**
- Heavy transactional requirements
- Complex reporting queries
- Strong ACID compliance needed
- Existing SQL infrastructure

**Why MongoDB works here:**
- Movie/booking data fits document model
- Rapid feature development
- Horizontal scaling potential
- Team familiarity with JavaScript/JSON

### **State Management: Redux Toolkit**

**Why Redux?**
- Centralized state management
- Predictable state updates
- Time-travel debugging
- Middleware support (redux-thunk)
- Persistent state with redux-persist

**Redux Flow in this App:**
```
Component Action Dispatch
        ↓
   Redux Action
        ↓
   Redux Reducer
        ↓
   Update State
        ↓
Component Re-render
```

### **Real-Time: Socket.IO**

**Why Socket.IO?**
- WebSocket with fallback options
- Automatic reconnection
- Room-based broadcasting
- Event-driven architecture
- Works behind proxies/load balancers

**Use Cases:**
- Real-time seat availability updates
- Parking slot status changes
- Admin dashboard live metrics
- Booking notifications

---

## 🔁 Request-Response Lifecycle

### **Detailed Example: User Books Movie Tickets**

#### **Phase 1: Client Request Preparation**

```javascript
// Frontend: pages/payment-new.jsx
const handleBooking = async () => {
  // 1. Dispatch Redux action to set loading state
  dispatch(bookingStart());
  
  // 2. Prepare request payload
  const bookingData = {
    movieId: movie._id,
    showtimeId: selectedShowtime._id,
    userId: currentUser._id,
    seatIds: selectedSeats.map(s => s._id),
    parkingSlotIds: selectedParking.map(p => p._id),
    totalCost: calculateTotal(),
    phone: userPhone,
    paymentIntentId: stripePaymentIntentId,
    paymentMethod: 'stripe'
  };
  
  // 3. Get authentication token
  const token = localStorage.getItem('access_token');
  
  // 4. Make API call
  const response = await axios.post(
    `${API_URL}/api/bookings`,
    bookingData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    }
  );
  
  // 5. Handle response
  if (response.status === 201) {
    dispatch(bookingSuccess(response.data));
    navigate('/booking-confirmation');
  }
};
```

#### **Phase 2: Network Transport**

```
Client (Browser)
    ↓ HTTPS Request
    ↓ Headers: Authorization, Content-Type, Cookies
    ↓ Body: JSON payload
    ↓
Internet
    ↓
CDN / Load Balancer (if applicable)
    ↓
Backend Server (Render)
```

#### **Phase 3: Server Request Processing**

```javascript
// Backend: api/index.js

// 1. CORS Middleware
app.use(cors({
  origin: ['https://www.cinexp.app', 'http://localhost:5173'],
  credentials: true
}));
// → Validates origin, sets CORS headers

// 2. Body Parser
app.use(express.json());
// → Parses JSON body into req.body

// 3. Cookie Parser
app.use(cookieParser());
// → Parses cookies into req.cookies

// 4. Morgan Logger
app.use(morgan('dev'));
// → Logs: POST /api/bookings 201 1234ms

// 5. Route Matching
app.use('/api', bookingRoutes);
// → Matches route, forwards to router

// Backend: api/routes/bookingRoutes.js
router.post('/bookings', verifyToken, createBooking);
// → Applies authentication middleware

// 6. Auth Middleware
export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
};
// → Verifies JWT, attaches user to req.user

// 7. Controller Execution
// Backend: api/controllers/bookingController.js
export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Extract data
    const { movieId, showtimeId, userId, seatIds, totalCost } = req.body;
    
    // Validate showtime
    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) throw new Error('Showtime not found');
    
    // Check if showtime is bookable
    const cutoffTime = new Date(showtime.startTime.getTime() - 15*60000);
    if (new Date() > cutoffTime) {
      throw new Error('Booking cutoff time passed');
    }
    
    // Verify seats are held by this user
    const seats = await Seat.find({
      _id: { $in: seatIds },
      userId,
      status: 'HELD'
    }).session(session);
    
    if (seats.length !== seatIds.length) {
      throw new Error('Some seats are no longer available');
    }
    
    // Update seats to SOLD
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { status: 'SOLD', holdUntil: null },
      { session }
    );
    
    // Create booking
    const booking = new Booking({
      movieId,
      showtimeId,
      userId,
      seatIds,
      totalCost,
      paymentStatus: 'COMPLETED',
      bookingReference: generateReference()
    });
    
    await booking.save({ session });
    
    // Commit transaction
    await session.commitTransaction();
    
    // Send confirmation email (async, don't await)
    sendBookingEmail(userId, booking);
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`showtime-${showtimeId}`).emit('seatsUpdated', {
      seats: seatIds,
      status: 'SOLD'
    });
    
    // Return success response
    res.status(201).json({
      success: true,
      booking: booking,
      message: 'Booking created successfully'
    });
    
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
```

#### **Phase 4: Database Operations**

```
Controller calls Mongoose Model
    ↓
Mongoose validates schema
    ↓
MongoDB query generated
    ↓
MongoDB Atlas receives query
    ↓
Query executed on collection
    ↓
Indexes used for optimization (if available)
    ↓
Document updated/inserted
    ↓
Write concern acknowledged
    ↓
Transaction committed
    ↓
Result returned to Mongoose
    ↓
Mongoose wraps result in document
    ↓
Document returned to controller
```

#### **Phase 5: Response Formation**

```javascript
// Controller formats response
const response = {
  success: true,
  booking: bookingDocument,
  message: 'Booking created successfully'
};

// Express serializes to JSON
res.status(201).json(response);
```

#### **Phase 6: Client Receives Response**

```javascript
// Frontend receives response
const response = await axios.post(...);

// Axios parses JSON
const data = response.data;

// Redux updates state
dispatch(bookingSuccess(data.booking));

// React re-renders
// Confirmation page shows booking details

// User sees success message
toast.success('Booking confirmed!');
```

#### **Phase 7: Real-Time Update (Socket.IO)**

```javascript
// Backend emits event
io.to(`showtime-${showtimeId}`).emit('seatsUpdated', {
  seats: updatedSeats,
  status: 'SOLD'
});

// Frontend receives event (all connected clients)
socket.on('seatsUpdated', (data) => {
  // Update local state
  setSeats(prevSeats => 
    prevSeats.map(seat => 
      data.seats.includes(seat._id)
        ? { ...seat, status: data.status }
        : seat
    )
  );
  
  // UI automatically updates
});
```

---

## 🌊 Data Flow Architecture

### **Frontend Data Flow (React + Redux)**

```
User Action (Click, Input)
        ↓
Event Handler in Component
        ↓
Dispatch Redux Action
        ↓
        ├─→ [Synchronous Action]
        │       ↓
        │   Reducer updates state immediately
        │       ↓
        │   Component re-renders
        │
        └─→ [Asynchronous Action Thunk]
                ↓
            API Call via Axios
                ↓
            [Waiting for response...]
                ↓
            Response received
                ↓
            Dispatch Success/Failure Action
                ↓
            Reducer updates state
                ↓
            Component re-renders
```

### **Backend Data Flow**

```
HTTP Request arrives
        ↓
Middleware Pipeline (Sequential)
        ↓
Route Handler
        ↓
Controller Method
        ↓
        ├─→ Validation
        ├─→ Business Logic
        ├─→ Database Queries (via Mongoose)
        ├─→ External Service Calls (Stripe, Email)
        └─→ Response Formation
        ↓
Response sent to client
        ↓
Logging & Monitoring
```

---

## 🔌 Real-Time Communication Architecture

### **Socket.IO WebSocket Flow**

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT                            │
│  ┌───────────────────────────────────────────────┐  │
│  │  import io from 'socket.io-client';           │  │
│  │  const socket = io('https://api.cinexp.app'); │  │
│  │                                                │  │
│  │  // Join a showtime room                      │  │
│  │  socket.emit('joinShowtime', showtimeId);     │  │
│  │                                                │  │
│  │  // Listen for updates                        │  │
│  │  socket.on('seatsUpdated', (data) => {        │  │
│  │    updateSeatsInUI(data);                     │  │
│  │  });                                           │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↕ WebSocket Connection
┌─────────────────────────────────────────────────────┐
│                    SERVER                            │
│  ┌───────────────────────────────────────────────┐  │
│  │  import { Server } from 'socket.io';          │  │
│  │  const io = new Server(httpServer);           │  │
│  │                                                │  │
│  │  io.on('connection', (socket) => {            │  │
│  │    // User joins specific showtime room       │  │
│  │    socket.on('joinShowtime', (id) => {        │  │
│  │      socket.join(`showtime-${id}`);           │  │
│  │    });                                         │  │
│  │  });                                           │  │
│  │                                                │  │
│  │  // Broadcast to all clients in room          │  │
│  │  io.to(`showtime-${id}`).emit('seatsUpdated', │  │
│  │     { seats: [...], status: 'SOLD' });        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### **Room-Based Broadcasting**

```
Multiple Users Viewing Same Showtime
        ↓
Each client connects to Socket.IO
        ↓
Clients emit 'joinShowtime' with showtimeId
        ↓
Server adds clients to room: `showtime-${id}`
        ↓
When any user books seats:
        ↓
Backend updates database
        ↓
Backend emits to room: `showtime-${id}`
        ↓
ALL clients in that room receive update instantly
        ↓
Each client updates their local UI
        ↓
All users see latest seat availability in real-time
```

---

## 🔒 Security Architecture

### **Authentication Flow**

```
1. User Signs In
        ↓
2. Backend validates credentials
        ↓
3. Backend generates JWT token
   - Payload: { id: userId, role: userRole }
   - Secret: process.env.JWT_SECRET
   - Expiry: 7 days
        ↓
4. Token sent in two ways:
   - HTTP-only Cookie (primary)
   - Response body (fallback)
        ↓
5. Frontend stores token:
   - Cookie (automatic)
   - LocalStorage (manual backup)
   - Redux state
        ↓
6. Subsequent requests include token:
   - Authorization: Bearer <token>
   - Cookie: access_token=<token>
        ↓
7. Backend middleware verifies token:
   - Extracts from header or cookie
   - Verifies signature
   - Checks expiry
   - Attaches user to req.user
        ↓
8. Route handler executes with authenticated context
```

### **Authorization Layers**

```
Public Routes (No auth required)
    ↓
    └─→ /api/movies (GET)
    └─→ /api/showtimes (GET)
    └─→ /api/auth/signin (POST)
    └─→ /api/auth/signup (POST)

Authenticated Routes (verifyToken)
    ↓
    └─→ /api/bookings (POST, GET)
    └─→ /api/user/profile (GET, PUT)
    └─→ /api/seats (POST)

Manager Routes (verifyManager)
    ↓
    └─→ /api/admin/dashboard (GET)
    └─→ /api/admin/users (GET)
    └─→ /api/admin/bookings (GET)

Admin Routes (verifyAdmin)
    ↓
    └─→ /api/admin/movies (POST, PUT, DELETE)
    └─→ /api/admin/users/:id (PUT)
```

---

## 📈 Scalability Considerations

### **Distributed Synchronization & Memory Layer**

We integrated **Redis** to serve as a high-speed distributed synchronization layer to handle real-time concurrency. This ensures that even when running multiple server instances behind a load balancer, seat and parking holds are locked globally using atomic Redis transactions.

See the full [Redis Feature Documentation](./REDIS_FEATURE.md) for more details.

### **Current Limitations**

1. **Single Server Instance**
   - No load balancing
   - Vertical scaling only
   - Single point of failure

2. **Monolithic Architecture**
   - All services coupled
   - Can't scale individual components

### **Proposed Scaling Strategy**

```
Phase 1: Horizontal Scaling
    ↓
    ├─→ Multiple backend instances behind load balancer
    ├─→ Redis adapter for Socket.IO multi-server broadcasting
    └─→ Shared session store (Redis)

Phase 2: Database Optimization
    ↓
    ├─→ MongoDB replica sets for read scaling
    ├─→ Sharding for write scaling
    └─→ Caching layer (Redis) for hot data

Phase 3: Microservices (if needed)
    ↓
    ├─→ Booking Service
    ├─→ Payment Service
    ├─→ Notification Service
    ├─→ User Service
    └─→ Movie Management Service

Phase 4: CDN & Caching
    ↓
    ├─→ Static assets on CDN
    ├─→ API response caching
    └─→ Edge caching for reads
```

---

## 🎯 Architecture Strengths

✅ Clear separation of concerns  
✅ RESTful API design  
✅ Real-time capabilities  
✅ Transaction support for data consistency  
✅ JWT-based stateless authentication  
✅ Role-based access control  
✅ Scheduled background jobs  
✅ Third-party integration ready  
✅ Error handling and logging  
✅ Responsive frontend  

## 🔄 Architecture Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| Monolithic | Simple deployment, faster development | Harder to scale individual services |
| NoSQL (MongoDB) | Flexible schema, fast development | Limited complex query support |
| JWT (Stateless) | Scalable, no server-side sessions | Can't revoke tokens easily |
| Socket.IO | Real-time updates, automatic fallback | Memory usage, scaling complexity |
| Single Database | Simple, ACID transactions | Single point of contention |

---

**Next:** [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)
