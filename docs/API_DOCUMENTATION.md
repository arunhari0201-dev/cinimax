# 📡 API DOCUMENTATION

## 📋 Table of Contents
1. [Base URL & Authentication](#base-url--authentication)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Movie Endpoints](#movie-endpoints)
4. [Showtime Endpoints](#showtime-endpoints)
5. [Seat Endpoints](#seat-endpoints)
6. [Booking Endpoints](#booking-endpoints)
7. [User Endpoints](#user-endpoints)
8. [Admin Endpoints](#admin-endpoints)
9. [Payment Endpoints](#payment-endpoints)
10. [Parking Endpoints](#parking-endpoints)
11. [Response Formats](#response-formats)
12. [Error Codes](#error-codes)

---

## 🌐 Base URL & Authentication

### **Base URLs**
- **Production**: `https://cinimax.onrender.com`
- **Development**: `http://localhost:5000`

### **Authentication**
Most endpoints require JWT authentication. Include token in requests:

**Method 1: Bearer Token (Recommended)**
```http
Authorization: Bearer <your_jwt_token>
```

**Method 2: Cookie**
```http
Cookie: access_token=<your_jwt_token>
```

### **Token Expiry**
- **Access Token**: 7 days
- **Refresh**: Use `/api/auth/refresh-token` endpoint

---

## 🔐 Authentication Endpoints

### **1. Sign Up**
Create a new user account.

```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "message": "User created successfully"
}
```

**Validations:**
- Username: Required, unique
- Email: Required, unique, valid email format
- Password: Required, minimum 6 characters

---

### **2. Sign In**
Authenticate user and get JWT token.

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "_id": "64abc123def456789",
  "username": "johndoe",
  "email": "john@example.com",
  "role": "user",
  "profilePicture": "https://...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Also sets cookie:**
```http
Set-Cookie: access_token=<jwt_token>; HttpOnly; SameSite=None; Secure
```

---

### **3. Google OAuth Sign In**
Authenticate using Google OAuth.

```http
POST /api/auth/google
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@gmail.com",
  "photo": "https://lh3.googleusercontent.com/..."
}
```

**Response (200 OK):**
```json
{
  "_id": "64abc123def456789",
  "username": "johndoe_12345",
  "email": "john@gmail.com",
  "role": "user",
  "isOAuthUser": true,
  "profilePicture": "https://...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### **4. Sign Out**
Clear authentication token.

```http
GET /api/auth/signout
```

**Response (200 OK):**
```json
{
  "message": "Signout successful"
}
```

---

### **5. Refresh Token**
Refresh JWT token before expiry.

```http
POST /api/auth/refresh-token
Cookie: access_token=<current_token>
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### **6. Validate Session**
Check if current session is valid.

```http
GET /api/auth/validate-session
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": "64abc123def456789",
    "username": "johndoe",
    "role": "user"
  }
}
```

---

## 🎬 Movie Endpoints

### **1. Get All Movies**
Fetch all movies with showtimes.

```http
GET /api/movies
```

**Response (200 OK):**
```json
[
  {
    "_id": "64def123abc456789",
    "title": "Inception",
    "year": 2010,
    "genre": "Sci-Fi, Thriller",
    "language": ["English", "Japanese"],
    "runtime": "148 min",
    "releaseDate": "2010-07-16",
    "cast": ["Leonardo DiCaprio", "Marion Cotillard"],
    "crew": {
      "director": "Christopher Nolan",
      "writer": "Christopher Nolan",
      "producer": ["Emma Thomas", "Christopher Nolan"]
    },
    "summary": "A thief who steals corporate secrets...",
    "poster": "https://cloudinary.com/.../inception.jpg",
    "status": "Released",
    "ratings": 8.8,
    "votes": 2500000,
    "duration": 148,
    "showtimes": [
      {
        "_id": "64xyz789abc123def",
        "movieId": "64def123abc456789",
        "screen": "Screen 1",
        "startTime": "2026-02-28T14:00:00.000Z",
        "endTime": "2026-02-28T16:30:00.000Z",
        "date": "2026-02-28T00:00:00.000Z",
        "isArchived": false,
        "bookingAvailable": true
      }
    ],
    "createdAt": "2025-01-10T08:00:00.000Z",
    "updatedAt": "2025-02-28T12:00:00.000Z"
  }
]
```

---

### **2. Get Movie by ID**
Fetch detailed movie information.

```http
GET /api/movies/:id
```

**Example:**
```http
GET /api/movies/64def123abc456789
```

**Response (200 OK):**
```json
{
  "_id": "64def123abc456789",
  "title": "Inception",
  "year": 2010,
  "genre": "Sci-Fi, Thriller",
  "language": ["English", "Japanese"],
  "runtime": "148 min",
  "releaseDate": "2010-07-16",
  "cast": ["Leonardo DiCaprio", "Marion Cotillard", "Ellen Page"],
  "crew": {
    "director": "Christopher Nolan",
    "writer": "Christopher Nolan",
    "producer": ["Emma Thomas", "Christopher Nolan"]
  },
  "productionCompanies": ["Warner Bros.", "Legendary Pictures"],
  "musicBy": "Hans Zimmer",
  "cinematography": "Wally Pfister",
  "editing": "Lee Smith",
  "budget": "$160 million",
  "summary": "A thief who steals corporate secrets through the use of dream-sharing technology...",
  "poster": "https://cloudinary.com/.../inception.jpg",
  "status": "Released",
  "ratings": 8.8,
  "votes": 2500000,
  "duration": 148,
  "showtimes": [...]
}
```

---

## 🎭 Showtime Endpoints

### **1. Get Showtimes**
Fetch showtimes with optional filters.

```http
GET /api/showtimes?movieId=<movieId>&date=<YYYY-MM-DD>
```

**Query Parameters:**
- `movieId` (optional): Filter by movie
- `date` (optional): Filter by date (YYYY-MM-DD format)
- `screen` (optional): Filter by screen

**Example:**
```http
GET /api/showtimes?movieId=64def123abc456789&date=2026-02-28
```

**Response (200 OK):**
```json
{
  "showtimes": [
    {
      "_id": "64xyz789abc123def",
      "movieId": {
        "_id": "64def123abc456789",
        "title": "Inception",
        "poster": "https://..."
      },
      "screen": "Screen 1",
      "startTime": "2026-02-28T14:00:00.000Z",
      "endTime": "2026-02-28T16:30:00.000Z",
      "date": "2026-02-28T00:00:00.000Z",
      "isArchived": false,
      "cutoffMinutes": 15,
      "bookingAvailable": true,
      "createdAt": "2026-02-27T00:00:00.000Z"
    }
  ]
}
```

---

## 💺 Seat Endpoints

### **1. Get Seats for Showtime**
Fetch all seats for a specific showtime.

```http
GET /api/seats?showtimeId=<showtimeId>
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "seats": [
    {
      "_id": "64seat1abc123def",
      "showtimeId": "64xyz789abc123def",
      "seatNumber": "A1",
      "category": "Gold",
      "price": 150,
      "status": "AVAILABLE",
      "holdUntil": null,
      "userId": null
    },
    {
      "_id": "64seat2abc123def",
      "showtimeId": "64xyz789abc123def",
      "seatNumber": "A2",
      "category": "Gold",
      "price": 150,
      "status": "HELD",
      "holdUntil": "2026-02-28T14:45:00.000Z",
      "userId": "64user123abc456def"
    },
    {
      "_id": "64seat3abc123def",
      "showtimeId": "64xyz789abc123def",
      "seatNumber": "A3",
      "category": "Platinum",
      "price": 180,
      "status": "SOLD",
      "holdUntil": null,
      "userId": "64user456def789abc"
    }
  ]
}
```

**Seat Status:**
- `AVAILABLE`: Can be selected
- `HELD`: Temporarily held (15 minutes)
- `SOLD`: Permanently booked

---

### **2. Hold Seats**
Temporarily hold seats for 15 minutes.

```http
POST /api/seats/hold
Authorization: Bearer <token>
Content-Type: application/json

{
  "seatIds": ["64seat1abc123def", "64seat2abc123def"],
  "showtimeId": "64xyz789abc123def"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Seats held successfully",
  "holdUntil": "2026-02-28T14:45:00.000Z",
  "seats": [
    {
      "_id": "64seat1abc123def",
      "seatNumber": "A1",
      "status": "HELD",
      "holdUntil": "2026-02-28T14:45:00.000Z"
    }
  ]
}
```

---

### **3. Release Seats**
Release held seats before timer expires.

```http
POST /api/seats/release
Authorization: Bearer <token>
Content-Type: application/json

{
  "seatIds": ["64seat1abc123def", "64seat2abc123def"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Seats released successfully"
}
```

---

## 🎟️ Booking Endpoints

### **1. Create Booking**
Create a new movie booking with payment.

```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "movieId": "64def123abc456789",
  "showtimeId": "64xyz789abc123def",
  "userId": "64user123abc456def",
  "seatIds": ["64seat1abc123def", "64seat2abc123def"],
  "parkingSlotIds": ["64park1abc123def"],
  "totalCost": 450,
  "phone": "+1234567890",
  "paymentIntentId": "pi_stripe123456",
  "paymentMethod": "stripe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking": {
    "_id": "64book123abc456def",
    "movieId": "64def123abc456789",
    "showtimeId": "64xyz789abc123def",
    "userId": "64user123abc456def",
    "seatIds": ["64seat1abc123def", "64seat2abc123def"],
    "parkingSlotIds": ["64park1abc123def"],
    "totalCost": 450,
    "paymentStatus": "COMPLETED",
    "paymentIntentId": "pi_stripe123456",
    "paymentMethod": "stripe",
    "bookingReference": "A7F2P9",
    "createdAt": "2026-02-28T14:30:00.000Z"
  }
}
```

---

### **2. Get User Bookings**
Fetch all bookings for logged-in user.

```http
GET /api/bookings/user
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "bookings": [
    {
      "_id": "64book123abc456def",
      "movieId": {
        "title": "Inception",
        "poster": "https://..."
      },
      "showtimeId": {
        "startTime": "2026-02-28T14:00:00.000Z",
        "screen": "Screen 1"
      },
      "seats": [
        { "seatNumber": "A1", "category": "Gold" },
        { "seatNumber": "A2", "category": "Gold" }
      ],
      "totalCost": 450,
      "paymentStatus": "COMPLETED",
      "bookingReference": "A7F2P9",
      "createdAt": "2026-02-28T14:30:00.000Z"
    }
  ]
}
```

---

## 👤 User Endpoints

### **1. Get User Profile**
Fetch authenticated user's profile.

```http
GET /api/user/profile
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "_id": "64user123abc456def",
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "user",
  "profilePicture": "https://...",
  "isOAuthUser": false,
  "isActive": true,
  "lastLogin": "2026-02-28T13:00:00.000Z",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2026-02-28T13:00:00.000Z"
}
```

---

### **2. Update User Profile**
Update user information.

```http
PUT /api/user/update/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "johndoe_updated",
  "phone": "+1234567890",
  "profilePicture": "https://new-image-url.com/photo.jpg"
}
```

**Response (200 OK):**
```json
{
  "message": "User updated successfully",
  "user": {
    "_id": "64user123abc456def",
    "username": "johndoe_updated",
    "email": "john@example.com",
    "phone": "+1234567890",
    "profilePicture": "https://new-image-url.com/photo.jpg"
  }
}
```

---

## 👑 Admin Endpoints

### **1. Get Dashboard Statistics**
Fetch admin dashboard metrics.

```http
GET /api/admin/dashboard
Authorization: Bearer <token>
```

**Required Role**: Manager or Admin

**Response (200 OK):**
```json
{
  "totalRevenue": 125000,
  "totalBookings": 450,
  "totalUsers": 1200,
  "recentBookings": [...],
  "popularMovies": [
    {
      "movie": "Inception",
      "bookings": 85,
      "revenue": 12750
    }
  ],
  "revenueByMonth": [...]
}
```

---

### **2. Get All Users**
Fetch all registered users (paginated).

```http
GET /api/admin/users?page=1&limit=20
Authorization: Bearer <token>
```

**Required Role**: Manager or Admin

**Response (200 OK):**
```json
{
  "users": [
    {
      "_id": "64user123abc456def",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-02-28T13:00:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "currentPage": 1,
  "totalPages": 60,
  "totalUsers": 1200
}
```

---

### **3. Update User Role**
Change user's role (RBAC).

```http
PUT /api/admin/users/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "manager"
}
```

**Required Role**: Admin

**Response (200 OK):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "_id": "64user123abc456def",
    "username": "johndoe",
    "role": "manager"
  }
}
```

**Valid Roles:**
- `user` (default)
- `staff`
- `manager`
- `admin`

---

## 💳 Payment Endpoints

### **1. Create Payment Intent (Stripe)**
Create Stripe payment intent for booking.

```http
POST /api/stripe/create-payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 450,
  "currency": "usd",
  "metadata": {
    "movieTitle": "Inception",
    "seats": "A1, A2",
    "showtime": "2026-02-28T14:00:00.000Z"
  }
}
```

**Response (200 OK):**
```json
{
  "clientSecret": "pi_3abc123_secret_xyz789",
  "paymentIntentId": "pi_3abc123def456789"
}
```

---

### **2. Confirm Payment**
Verify payment completion.

```http
POST /api/stripe/confirm-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_3abc123def456789"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "status": "succeeded",
  "amount": 450
}
```

---

## 🅿️ Parking Endpoints

### **1. Get Parking Slots**
Fetch parking availability for showtime.

```http
GET /api/parking?showtimeId=<showtimeId>
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "parkingSlots": {
    "twoWheeler": [
      {
        "_id": "64park1abc123def",
        "slotNumber": "2W-01",
        "vehicleType": "twoWheeler",
        "price": 50,
        "status": "AVAILABLE",
        "showtimeId": "64xyz789abc123def"
      }
    ],
    "fourWheeler": [
      {
        "_id": "64park2abc123def",
        "slotNumber": "4W-01",
        "vehicleType": "fourWheeler",
        "price": 100,
        "status": "AVAILABLE",
        "showtimeId": "64xyz789abc123def"
      }
    ]
  }
}
```

---

## 📋 Response Formats

### **Success Response**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description",
  "statusCode": 400
}
```

---

## ❌ Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid input, missing required fields |
| 401 | Unauthorized | No token provided, invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry, seats already booked |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Server-side error |

### **Common Error Messages**

**Authentication Errors:**
```json
{ "message": "No token provided" }
{ "message": "Invalid or expired token" }
{ "message": "User not found" }
```

**Authorization Errors:**
```json
{ "message": "Admin access required" }
{ "message": "Manager access required" }
```

**Booking Errors:**
```json
{ "message": "Showtime not found" }
{ "message": "Booking cutoff time passed" }
{ "message": "Some seats are no longer available" }
```

---

## 🎯 Interview Tips

### **Q: How did you design your API?**

**Answer**: "I designed RESTful APIs following best practices:
- Used appropriate HTTP methods (GET, POST, PUT, DELETE)
- Implemented JWT authentication for secure endpoints
- Structured responses consistently
- Used proper HTTP status codes
- Implemented role-based access control
- Added input validation using express-validator
- Documented all endpoints with request/response examples"

### **Q: How do you handle API versioning?**

**Answer**: "Currently using implicit v1. For future versions, I would:
- Use URL versioning: `/api/v1/`, `/api/v2/`
- Or header versioning: `Accept: application/vnd.api.v2+json`
- Maintain backward compatibility
- Deprecate old versions gradually"

---

**Next:** [AUTH_FLOW.md](./AUTH_FLOW.md)
