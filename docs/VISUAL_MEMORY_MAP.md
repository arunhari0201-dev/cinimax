# 🗺️ VISUAL MEMORY MAP

## 📋 Purpose
This document provides **visual representations** of how the entire system works. Use these diagrams to **quickly recall** architecture, data flow, and system interactions during interviews.

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  React Application (www.cinexp.app - Vercel CDN)             │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐        │  │
│  │  │  Components │  │ Redux Store  │  │  Socket.IO   │        │  │
│  │  │   (UI/UX)   │  │ (State Mgmt) │  │   Client     │        │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘        │  │
│  └─────────┼────────────────┼──────────────────┼────────────────┘  │
└────────────┼────────────────┼──────────────────┼───────────────────┘
             │                │                  │
             │ HTTP(S)        │ localStorage     │ WebSocket
             │ REST API       │ (Redux Persist)  │ (Real-time)
             │                │                  │
             ↓                ↓                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERNET (HTTPS/WSS)                              │
└─────────────────────────────────────────────────────────────────────┘
             │                                   │
             ↓                                   ↓
┌────────────────────────────────────────────────────────────────────┐
│  Backend Server (cinimax.onrender.com - Render Cloud)             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Express.js Server (Node.js Runtime)                         │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │ │
│  │  │ Middleware │  │Controllers │  │ Socket.IO  │            │ │
│  │  │  (Auth,    │→ │ (Business  │  │  Server    │            │ │
│  │  │   CORS,    │  │  Logic)    │  │ (Rooms)    │            │ │
│  │  │  Helmet)   │  └─────┬──────┘  └────────────┘            │ │
│  │  └────────────┘        │                                     │ │
│  │                        ↓                                     │ │
│  │  ┌────────────────────────────────────────┐                 │ │
│  │  │  Mongoose ODM (Models & Schemas)       │                 │ │
│  │  └──────────────────┬─────────────────────┘                 │ │
│  └─────────────────────┼───────────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ↓ MongoDB Protocol
┌────────────────────────────────────────────────────────────────────┐
│  MongoDB Atlas (Cloud Database - AWS)                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Collections:                                                 │ │
│  │  • users        • movies       • showtimes                    │ │
│  │  • seats        • bookings     • parkingslots                 │ │
│  │  • confirmpayments  • contactmessages  • faqquestions         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  External Services                                                  │
├────────────────────────────────────────────────────────────────────┤
│  Stripe API ────→ Payment Processing                               │
│  Cloudinary ────→ Image Storage & CDN                              │
│  Nodemailer ────→ Email Notifications                              │
│  Firebase   ────→ Google OAuth Authentication                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Frontend ↔ Backend Communication

### **HTTP REST API Communication**

```
┌─────────────┐                                      ┌─────────────┐
│   React     │                                      │   Express   │
│  Component  │                                      │   Backend   │
└──────┬──────┘                                      └──────┬──────┘
       │                                                    │
       │ 1. User Action (e.g., clicks "Book Ticket")       │
       │                                                    │
       │ 2. Dispatch Redux Action                          │
       │    dispatch(bookingStart())                       │
       │                                                    │
       │ 3. Axios HTTP Request                             │
       │    POST /api/bookings                             │
       │    Headers:                                        │
       │      Authorization: Bearer <JWT>                  │
       │      Content-Type: application/json               │
       │    Body:                                           │
       │      { movieId, showtimeId, seatIds }             │
       ├───────────────────────────────────────────────────>│
       │                                                    │
       │                              4. CORS Middleware    │
       │                         verify origin = cinexp.app │
       │                                                    │
       │                              5. Body Parser        │
       │                         parse JSON body            │
       │                                                    │
       │                              6. Auth Middleware    │
       │                         verify JWT token           │
       │                         attach user to req.user    │
       │                                                    │
       │                              7. Route Handler      │
       │                         match /api/bookings        │
       │                                                    │
       │                              8. Controller         │
       │                         validate data              │
       │                         check business logic       │
       │                         query database             │
       │                                                    │
       │                              9. MongoDB Query      │
       │                         await Booking.create(...)  │
       │                                                    │
       │                              10. Response          │
       │ 11. HTTP Response                                  │
       │     Status: 201 Created                            │
       │     Body: { booking data }                         │
       │<───────────────────────────────────────────────────┤
       │                                                    │
       │ 12. Update Redux State                            │
       │     dispatch(bookingSuccess(data))                │
       │                                                    │
       │ 13. Component Re-renders                          │
       │     shows confirmation UI                         │
       │                                                    │
       ↓                                                    ↓
```

---

### **WebSocket (Socket.IO) Real-Time Communication**

```
┌────────────────┐                               ┌─────────────────┐
│  React Client  │                               │ Express Server  │
│   (User A)     │                               │   + Socket.IO   │
└────────┬───────┘                               └────────┬────────┘
         │                                                 │
         │ 1. Component mounts                            │
         │    const socket = io(serverURL)                │
         ├────────────────────────────────────────────────>│
         │         WebSocket Handshake                     │
         │<────────────────────────────────────────────────┤
         │         Connection Established                  │
         │                                                 │
         │ 2. Join specific room                           │
         │    socket.emit('joinShowtime', showtimeId)     │
         ├────────────────────────────────────────────────>│
         │                                 socket.join()   │
         │                                 room created    │
         │                                                 │
         │ 3. User selects seat                            │
         │    socket.emit('holdSeat', { seatId, userId }) │
         ├────────────────────────────────────────────────>│
         │                               DB Update: Seat   │
         │                               status = HELD     │
         │                                                 │
         │ 4. Broadcast to all in room                     │
         │    io.to(room).emit('seatsUpdated', [seat])   │
         │<────────────────────────────────────────────────┤
         │                                                 │
         │ 5. Update local state                          │
         │    setSeats(updated)                           │
         │                                                 │
         ↓                                                 ↓

┌────────────────┐                               
│  React Client  │                               
│   (User B)     │                               
└────────┬───────┘                               
         │                                                 
         │ Also connected to same showtime room           
         │<────────────────────────────────────────────────
         │         Receives 'seatsUpdated' event           
         │         (User A's seat selection)               
         │                                                 
         │ Updates UI immediately                         
         │ Seat now shows as "HELD" or "SELECTED"        
         │                                                 
         ↓                                                 

KEY BENEFIT: All users see changes in real-time without polling!
```

---

## 🔐 Authentication Flow

### **JWT Token Authentication**

```
┌──────────────┐                                    ┌──────────────┐
│   Browser    │                                    │   Backend    │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │ 1. User enters credentials                       │
       │    { email, password }                           │
       ├──────────────────────────────────────────────────>│
       │         POST /api/auth/signin                     │
       │                                                   │
       │                               2. Find user by email
       │                               User.findOne({ email })
       │                                                   │
       │                               3. Compare password │
       │                               bcrypt.compareSync() │
       │                               (✓ password matches) │
       │                                                   │
       │                               4. Generate JWT     │
       │                               const token = jwt.sign(
       │                                 { id: user._id },  │
       │                                 JWT_SECRET,        │
       │                                 { expiresIn: '7d' }
       │                               )                    │
       │                                                   │
       │                               5. Set HttpOnly Cookie
       │                               res.cookie('access_token',
       │                                 token, {           │
       │                                   httpOnly: true,  │
       │                                   secure: true     │
       │                                 })                 │
       │                                                   │
       │ 6. Response                                       │
       │    Status: 200 OK                                 │
       │    Set-Cookie: access_token=eyJhbGc...            │
       │    Body: { user data }                            │
       │<──────────────────────────────────────────────────┤
       │                                                   │
       │ 7. Store user in Redux                           │
       │    dispatch(signInSuccess(userData))             │
       │                                                   │
       │ 8. Persist to localStorage                       │
       │    localStorage.setItem('persist:root', ...)     │
       │                                                   │
       ↓                                                   ↓

┌──────────────────────────────────────────────────────────────────┐
│  Cookie Storage (Browser)                                        │
├──────────────────────────────────────────────────────────────────┤
│  Name: access_token                                              │
│  Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1M...   │
│  HttpOnly: true    ← JavaScript CANNOT access (XSS protection)   │
│  Secure: true      ← Only sent over HTTPS                        │
│  SameSite: none    ← Allows cross-site requests                  │
│  Expires: 7 days                                                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  localStorage (Browser)                                          │
├──────────────────────────────────────────────────────────────────┤
│  Key: persist:root                                               │
│  Value: {                                                        │
│    user: {                                                       │
│      currentUser: {                                              │
│        _id: "653abc...",                                         │
│        username: "john",                                         │
│        email: "john@example.com",                                │
│        role: "user"                                              │
│      }                                                           │
│    }                                                             │
│  }                                                               │
│  ← NO TOKEN STORED HERE (only user data)                        │
└──────────────────────────────────────────────────────────────────┘
```

---

### **Protected Route Request**

```
┌──────────────┐                                    ┌──────────────┐
│   Browser    │                                    │   Backend    │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │ User navigates to protected page                 │
       │ (e.g., /profile)                                 │
       │                                                   │
       │ 1. Request with cookie                           │
       │    GET /api/users/profile                        │
       │    Cookie: access_token=eyJhbGc...               │
       ├──────────────────────────────────────────────────>│
       │                                                   │
       │                               2. Extract token   │
       │                               from cookie/header  │
       │                                                   │
       │                               3. Verify JWT      │
       │                               jwt.verify(token,   │
       │                                 JWT_SECRET)       │
       │                                                   │
       │                               ✓ Valid & not expired
       │                                                   │
       │                               4. Decode payload  │
       │                               { id: "653abc..." } │
       │                                                   │
       │                               5. Attach to req   │
       │                               req.user = decoded  │
       │                                                   │
       │                               6. Find user in DB │
       │                               User.findById(req.user.id)
       │                                                   │
       │                               7. Check permissions
       │                               if (user.role !== 'admin')
       │                                 return 403        │
       │                                                   │
       │ 8. Response                                       │
       │    Status: 200 OK                                 │
       │    Body: { user profile data }                    │
       │<──────────────────────────────────────────────────┤
       │                                                   │
       ↓                                                   ↓
```

---

## 🗄️ Database Structure & Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MongoDB Collections                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    USERS     │
├──────────────┤               ┌──────────────┐
│ _id (PK)     │<──────────────│   BOOKINGS   │
│ username     │   1        N  ├──────────────┤
│ email        │               │ _id (PK)     │
│ password     │               │ userId (FK)  │────┐
│ role         │               │ movieId (FK) │    │
│ phone        │               │ showtimeId   │    │
│ profilePic   │               │ seatIds[]    │    │
└──────────────┘               │ totalCost    │    │
                               │ paymentStatus│    │
       │                       │ bookingRef   │    │
       │                       └──────────────┘    │
       │                                           │
       │ 1                                         │ N
       │                                           │
       │                       ┌──────────────┐    │
       │                       │    SEATS     │<───┘
       │                       ├──────────────┤
       │                       │ _id (PK)     │
       │              ┌────────│ showtimeId(FK)
       │              │        │ seatNumber   │
       │              │        │ category     │
       │              │        │ status       │
       │              │        │ price        │
       │              │        │ userId (FK)  │───┐
       │              │        │ holdUntil    │   │
       │              │        └──────────────┘   │
       │              │                           │
       │              │                           │
       │              │ N                         │ (hold)
       │              │                           │
       │              │                           │
       │        ┌─────┴────────┐                  │
       │        │  SHOWTIMES   │                  │
       │        ├──────────────┤                  │
       │        │ _id (PK)     │                  │
       │    ────│ movieId (FK) │                  │
       │   N    │ screen       │                  │
       │        │ startTime    │                  │
       │        │ endTime      │                  │
       │        │ isArchived   │                  │
       │        └──────┬───────┘                  │
       │               │                          │
       │               │ N                        │
       │               │                          │
       │        ┌──────┴───────┐                  │
       │        │    MOVIES    │                  │
       │   1    ├──────────────┤                  │
       └────────│ _id (PK)     │                  │
                │ title        │                  │
                │ genre[]      │                  │
                │ duration     │                  │
                │ poster       │                  │
                │ rating       │                  │
                │ cast[]       │                  │
                │ crew{}       │                  │
                └──────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Relationship Types                                              │
├──────────────────────────────────────────────────────────────────┤
│  User → Bookings         : 1 to N  (one user, many bookings)    │
│  Movie → Showtimes       : 1 to N  (one movie, many showtimes)  │
│  Showtime → Seats        : 1 to N  (one showtime, many seats)   │
│  Booking → Seats         : N to M  (many seats per booking)     │
│  User → Seats (holds)    : 1 to N  (user can hold many seats)   │
└──────────────────────────────────────────────────────────────────┘
```

---

### **Document Example Flow**

```javascript
// 1. MOVIE Document
{
  _id: ObjectId("movie123"),
  title: "Inception",
  genre: ["Action", "Sci-Fi"],
  duration: 148,
  poster: "https://cloudinary.com/inception.jpg",
  rating: 8.8
}
     ↓ Referenced by
// 2. SHOWTIME Document
{
  _id: ObjectId("showtime456"),
  movieId: ObjectId("movie123"),  // ← Reference to Movie
  screen: "Screen 1",
  startTime: ISODate("2024-01-20T19:00:00Z"),
  endTime: ISODate("2024-01-20T21:28:00Z"),
  isArchived: false
}
     ↓ Referenced by
// 3. SEAT Documents (200 per showtime)
{
  _id: ObjectId("seat789"),
  showtimeId: ObjectId("showtime456"),  // ← Reference to Showtime
  seatNumber: "A1",
  category: "Gold",
  status: "HELD",
  price: 15,
  userId: ObjectId("user321"),  // ← Reference to User
  holdUntil: ISODate("2024-01-20T18:50:00Z")
}
     ↓ Referenced by
// 4. BOOKING Document (final)
{
  _id: ObjectId("booking999"),
  userId: ObjectId("user321"),  // ← Reference to User
  movieId: ObjectId("movie123"),  // ← Reference to Movie
  showtimeId: ObjectId("showtime456"),  // ← Reference to Showtime
  seatIds: [
    ObjectId("seat789"),  // ← References to Seats
    ObjectId("seat790")
  ],
  totalCost: 30,
  paymentStatus: "COMPLETED",
  paymentIntentId: "pi_3ABC123",
  bookingReference: "BK1705771200XYZ",
  createdAt: ISODate("2024-01-20T18:45:00Z")
}
```

---

### **Query Patterns with Populate**

```javascript
// Fetch booking with all related data
const booking = await Booking.findById(bookingId)
  .populate('userId', 'username email')
  .populate('movieId', 'title poster duration')
  .populate('showtimeId', 'startTime screen')
  .populate('seatIds', 'seatNumber category');

// Result: One document with all nested data
{
  _id: "booking999",
  userId: {
    _id: "user321",
    username: "john",
    email: "john@example.com"
  },
  movieId: {
    _id: "movie123",
    title: "Inception",
    poster: "...",
    duration: 148
  },
  showtimeId: {
    _id: "showtime456",
    startTime: "2024-01-20T19:00:00Z",
    screen: "Screen 1"
  },
  seatIds: [
    { _id: "seat789", seatNumber: "A1", category: "Gold" },
    { _id: "seat790", seatNumber: "A2", category: "Gold" }
  ],
  totalCost: 30,
  bookingReference: "BK1705771200XYZ"
}

// MongoDB actually runs 4 queries behind the scenes:
// 1. Find booking
// 2. Find user by userId
// 3. Find movie by movieId
// 4. Find showtime by showtimeId
// 5. Find seats by seatIds[]
```

---

## 🛡️ Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Network Security (HTTPS/WSS)                          │
├─────────────────────────────────────────────────────────────────┤
│  ✓ All traffic encrypted with TLS 1.3                          │
│  ✓ SSL certificates (Let's Encrypt, auto-renewed)              │
│  ✓ Vercel & Render handle certificate management               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Input Validation & Sanitization                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend:                                                      │
│  - React controlled inputs                                      │
│  - Client-side validation (email format, password length)      │
│                                                                  │
│  Backend:                                                       │
│  - express-validator for request data                           │
│  - express-mongo-sanitize removes $ and . operators             │
│  - Mongoose schema validation                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: CORS & Security Headers (Helmet)                     │
├─────────────────────────────────────────────────────────────────┤
│  CORS Whitelist:                                                │
│  - Only www.cinexp.app allowed                                  │
│  - Credentials: true (cookies allowed)                          │
│                                                                  │
│  Helmet Headers:                                                │
│  - X-Content-Type-Options: nosniff                              │
│  - X-Frame-Options: DENY                                        │
│  - X-XSS-Protection: 1; mode=block                              │
│  - Content-Security-Policy: (CSP rules)                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Authentication (JWT)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Registration:                                                  │
│  - Password hashed with bcrypt (10 rounds)                      │
│  - Stored hash: $2a$10$abc123... (60 chars)                     │
│                                                                  │
│  Login:                                                         │
│  - JWT token generated with secret key                          │
│  - Token set in HttpOnly cookie (XSS protection)                │
│  - 7-day expiry                                                  │
│                                                                  │
│  Protected Routes:                                              │
│  - Middleware verifies JWT on every request                     │
│  - Invalid/expired tokens rejected with 401/403                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: Authorization (RBAC)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Role Hierarchy:                                                │
│  - user: Can book tickets, view own bookings                    │
│  - staff: + View all bookings                                   │
│  - manager: + Manage movies, showtimes                          │
│  - admin: + User management, system config                      │
│                                                                  │
│  Middleware Checks:                                             │
│  - verifyToken: Checks authentication                           │
│  - verifyManager: Checks role is manager or admin               │
│  - verifyAdmin: Checks role is admin only                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 6: Database Security                                     │
├─────────────────────────────────────────────────────────────────┤
│  MongoDB Atlas:                                                 │
│  - Network isolation (VPC)                                      │
│  - IP whitelist (only backend server IPs)                       │
│  - Database authentication (username/password)                  │
│  - Encrypted connections (TLS)                                  │
│  - Encryption at rest                                           │
│                                                                  │
│  Mongoose Protection:                                           │
│  - Automatic type casting                                       │
│  - Schema validation                                            │
│  - Parameterized queries (no string concatenation)              │
│  - Prevents NoSQL injection                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 7: Payment Security (Stripe)                             │
├─────────────────────────────────────────────────────────────────┤
│  - Card details NEVER touch our server                          │
│  - Stripe.js handles PCI compliance                             │
│  - Payment intent verification on backend                       │
│  - Webhook signature verification                               │
│  - HTTPS required for all payment operations                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 8: Application Logic                                     │
├─────────────────────────────────────────────────────────────────┤
│  Business Rule Enforcement:                                     │
│  - Check showtime hasn't started before booking                 │
│  - Verify seats are HELD by requesting user                     │
│  - Atomic operations for seat selection                         │
│  - Transaction for booking (all-or-nothing)                     │
│  - Refund payment if seats unavailable                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📈 Scalability Issues & Solutions

### **Current Bottlenecks**

```
┌──────────────────────────────────────────────────────────────────┐
│  Problem 1: Single Server Instance                              │
├──────────────────────────────────────────────────────────────────┤
│  Current:                                                        │
│  ┌────────┐                                                      │
│  │ Render │  ← All traffic hits one server                      │
│  │ Server │     Capacity: ~100 concurrent users                 │
│  └────────┘                                                      │
│                                                                  │
│  Solution: Horizontal Scaling                                   │
│  ┌──────────────┐                                               │
│  │Load Balancer │                                               │
│  └───────┬──────┘                                               │
│      ┌───┴───┬──────┬──────┐                                    │
│  ┌───▼──┐ ┌──▼──┐ ┌──▼──┐ ┌▼────┐                             │
│  │Server1│ │Srv2│  │Srv3│  │Srv4│                              │
│  └───────┘ └─────┘ └─────┘ └─────┘                              │
│    Capacity: 400+ concurrent users                              │
│                                                                  │
│  Implementation:                                                │
│  - Deploy to Kubernetes (EKS/GKE)                               │
│  - Use Nginx/AWS ALB as load balancer                           │
│  - Sticky sessions for Socket.IO                                │
│  - Redis for shared session storage                             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Problem 2: No Caching Layer                                     │
├──────────────────────────────────────────────────────────────────┤
│  Current: Every request hits MongoDB                            │
│  GET /api/movies → MongoDB → 180ms                              │
│  GET /api/movies → MongoDB → 180ms (same data!)                 │
│                                                                  │
│  Solution: Multi-Level Caching                                  │
│                                                                  │
│  Level 1: CDN (CloudFlare/Vercel)                               │
│  ┌────────┐                                                      │
│  │  CDN   │ ← Static assets, images                             │
│  └────────┘    Response time: 10-50ms                            │
│                                                                  │
│  Level 2: Redis (API Responses)                                 │
│  ┌────────┐                                                      │
│  │ Redis  │ ← Movie lists, showtime data                        │
│  └────────┘    TTL: 5-10 minutes                                 │
│                 Response time: 5-15ms                            │
│                                                                  │
│  Level 3: Database Query Cache                                  │
│  ┌──────────┐                                                    │
│  │ MongoDB  │ ← Fresh data for bookings                         │
│  └──────────┘    Response time: 80-180ms                         │
│                                                                  │
│  Implementation:                                                │
│  - Redis on ElastiCache/Redis Cloud                             │
│  - Cache-Control headers for CDN                                 │
│  - Invalidate cache on updates                                  │
│  - Expected improvement: 10-15x faster responses                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Problem 3: Database Query Performance                          │
├──────────────────────────────────────────────────────────────────┤
│  Current Issues:                                                │
│  - N+1 queries in showtime fetching                             │
│  - No query optimization                                        │
│  - Single database for all operations                           │
│                                                                  │
│  Solution: Database Optimization                                │
│                                                                  │
│  1. Query Optimization                                          │
│     Use .populate() instead of separate queries                 │
│     Add .lean() for read-only queries                           │
│     Select only necessary fields                                │
│                                                                  │
│  2. Read Replicas                                               │
│     ┌─────────┐                                                 │
│     │ Primary │ ← Write operations                              │
│     └────┬────┘                                                 │
│      Replication                                                │
│     ┌────┴────┬────────────┐                                    │
│  ┌──▼───┐ ┌──▼───┐  ┌─────▼──┐                                │
│  │Replica1│Replica2│  │Replica3│ ← Read operations             │
│  └────────┘ └──────┘  └────────┘                                │
│                                                                  │
│  3. Sharding (For 1M+ documents)                                │
│     Shard by: theater_id or date_range                          │
│     ┌──────────┬──────────┬──────────┐                          │
│     │ Shard 1  │ Shard 2  │ Shard 3  │                          │
│     │Theaters  │Theaters  │Theaters  │                          │
│     │  1-100   │ 101-200  │ 201-300  │                          │
│     └──────────┴──────────┴──────────┘                          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Problem 4: Socket.IO Doesn't Scale Across Servers              │
├──────────────────────────────────────────────────────────────────┤
│  Current: Socket.IO bound to single server                      │
│  User A on Server1 can't see updates from User B on Server2    │
│                                                                  │
│  Solution: Redis Adapter for Socket.IO                          │
│                                                                  │
│  ┌──────────┐          ┌────────┐         ┌──────────┐         │
│  │ Server 1 │◄─────────┤ Redis  ├─────────►│ Server 2 │         │
│  │ Socket.IO│   Pub/Sub│ Adapter│  Pub/Sub │ Socket.IO│         │
│  └────┬─────┘          └────────┘          └─────┬────┘         │
│       │                                           │              │
│  ┌────▼────┐                               ┌────▼─────┐         │
│  │ User A  │                               │  User B  │         │
│  │ Room:   │                               │  Room:   │         │
│  │showtime1│                               │showtime1 │         │
│  └─────────┘                               └──────────┘         │
│                                                                  │
│  When User A selects seat:                                      │
│  1. Server 1 updates database                                   │
│  2. Server 1 publishes to Redis: "seat-update"                  │
│  3. Redis broadcasts to all servers                             │
│  4. Server 2 receives message                                   │
│  5. Server 2 emits to User B in same room                       │
│  6. User B sees update in real-time                             │
│                                                                  │
│  Implementation:                                                │
│  import { createAdapter } from '@socket.io/redis-adapter';      │
│  io.adapter(createAdapter(pubClient, subClient));               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Problem 5: Cold Starts (Render Free Tier)                      │
├──────────────────────────────────────────────────────────────────┤
│  Current: Server spins down after 15 min inactivity             │
│  First request after sleep: 20-30 seconds response              │
│                                                                  │
│  Solutions:                                                     │
│  1. Upgrade to paid plan ($7/mo) - always-on servers            │
│  2. Implement warming service (ping every 10 min)               │
│  3. Use serverless for static endpoints (AWS Lambda)            │
│  4. Add "Service Warming" message on frontend during cold start │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎓 Interview Memory Aids

### **"Explain Your Stack in 30 Seconds"**

"MERN stack: **MongoDB** for flexible data storage with Mongoose schemas, **Express** backend with REST APIs and Socket.IO for real-time updates, **React** frontend with Redux state management and React Router, **Node.js** runtime. Deployed on Vercel (frontend) and Render (backend). Stripe for payments, JWT for auth, bcrypt for passwords, Cloudinary for images. Everything communicates over HTTPS/WebSocket."

### **"How Does Real-Time Work?"**

"Socket.IO creates persistent WebSocket connections. When users select seats, they join a room for that specific showtime. Updates are broadcast only to users in the same room. The server stores nothing about connections—Redis adapter enables scaling across multiple servers by pub/sub pattern."

### **"Database Relationships?"**

"**One-to-Many**: User has many bookings, Movie has many showtimes, Showtime has many seats. **References**: Bookings store ObjectId arrays pointing to seats. **Populate**: Mongoose fetches related data with `.populate()` which is MongoDB's equivalent of SQL JOIN. **Why not embed?** Seats update frequently and independently, so references are better than embedding."

### **"Security Approach?"**

"**Defense in depth**: HTTPS everywhere, Helmet security headers, CORS whitelist, JWT in HttpOnly cookies to prevent XSS, bcrypt-hashed passwords, role-based authorization middleware, MongoDB Atlas network isolation, Mongoose prevents NoSQL injection, Stripe handles PCI compliance. Every layer adds protection."

---

## 📊 Request-Response Timing

```
Typical API Request Breakdown:

User clicks button
      ↓
[Frontend Processing: 1-5ms]
  - Event handler
  - Redux action dispatch
  - State update
      ↓
[Network Latency: 20-100ms]
  - DNS lookup (cached)
  - TCP handshake
  - TLS handshake
  - HTTP request transmission
      ↓
[Backend Processing: 50-200ms]
  - Middleware chain: 2-5ms
  - JWT verification: 1-2ms
  - Controller logic: 5-10ms
  - Database query: 40-180ms
      ↓
[Network Return: 20-100ms]
  - HTTP response transmission
      ↓
[Frontend Update: 5-20ms]
  - Redux reducer
  - Component re-render
  - DOM update
      ↓
USER SEES RESULT

Total: 96-425ms (avg ~200ms)

Optimizations:
- Add caching → 96-50ms (80% requests)
- CDN for static → 10-30ms
- Database indexes → 180ms → 40ms
- Code splitting → Initial load 3s → 1s
```

---

**This visual map should help you quickly recall the entire system architecture during interviews. All diagrams are designed to be drawable on a whiteboard!**
