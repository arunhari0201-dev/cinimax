# 🗄️ DATABASE DESIGN & SCHEMA

## 📋 Table of Contents
1. [Database Overview](#database-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Schema Designs](#schema-designs)
4. [Relationships & References](#relationships--references)
5. [Indexes & Optimization](#indexes--optimization)
6. [Data Flow](#data-flow)
7. [Normalization Analysis](#normalization-analysis)
8. [Scalability Considerations](#scalability-considerations)
9. [Interview Q&A](#interview-qa)

---

## 🎯 Database Overview

### **Database Type**
**MongoDB** - NoSQL Document Database

### **Why MongoDB?**

| Reason | Explanation |
|--------|-------------|
| **Flexible Schema** | Movie and booking data structures can evolve |
| **JSON-like Documents** | Natural fit with JavaScript/Node.js stack |
| **Horizontal Scalability** | Sharding support for future growth |
| **Embedded Documents** | Reduce joins, faster reads |
| **Rich Query Language** | Supports complex queries despite being NoSQL |
| **Atlas Cloud** | Managed service, automatic backups |

### **Database Connection**

```javascript
// api/index.js
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));
```

### **Environment Variable**
```env
MONGO=mongodb+srv://username:password@cluster.mongodb.net/cinemabooking?retryWrites=true&w=majority
```

---

## 🔗 Entity Relationship Diagram

### **Visual ER Diagram**

```
                    ┌─────────────────┐
                    │      USER       │
                    ├─────────────────┤
                    │ _id (PK)        │
                    │ username        │
                    │ email           │
                    │ password        │
                    │ role            │
                    │ profilePicture  │
                    │ isOAuthUser     │
                    │ isActive        │
                    │ lastLogin       │
                    │ createdAt       │
                    │ updatedAt       │
                    └────────┬────────┘
                             │
                             │ 1:N (has many)
                             │
                    ┌────────▼────────┐
                    │    BOOKING      │
                    ├─────────────────┤
                    │ _id (PK)        │
                    │ userId (FK)     │◄──────────┐
                    │ movieId (FK)    │           │
                    │ showtimeId (FK) │           │
                    │ seatIds [FK]    │           │
                    │ parkingSlotIds  │           │
                    │ totalCost       │           │
                    │ paymentStatus   │           │
                    │ paymentIntentId │           │
                    │ bookingReference│           │
                    │ createdAt       │           │
                    └────────┬────────┘           │
                             │                    │
               ┌─────────────┼────────────┐       │
               │             │            │       │
               │ N:1         │ N:1        │ N:1   │
               │             │            │       │
      ┌────────▼────────┐   │   ┌────────▼────────┐
      │     MOVIE       │   │   │   SHOWTIME      │
      ├─────────────────┤   │   ├─────────────────┤
      │ _id (PK)        │   │   │ _id (PK)        │
      │ title           │   │   │ movieId (FK)    │──┐
      │ year            │   │   │ screen          │  │
      │ genre           │   │   │ startTime       │  │
      │ language []     │   │   │ endTime         │  │
      │ runtime         │   │   │ date            │  │
      │ releaseDate     │   │   │ isArchived      │  │
      │ cast []         │   │   │ cutoffMinutes   │  │
      │ crew {}         │   │   │ createdAt       │  │
      │ summary         │   │   │ updatedAt       │  │
      │ poster          │   │   └────────┬────────┘  │
      │ status          │   │            │           │
      │ ratings         │   │            │ 1:N       │
      │ votes           │   │            │           │
      │ duration        │   │   ┌────────▼────────┐  │
      │ createdAt       │   │   │      SEAT       │  │
      │ updatedAt       │   │   ├─────────────────┤  │
      └─────────────────┘   │   │ _id (PK)        │  │
                            │   │ movieId (FK) ───┼──┘
                            │   │ showtimeId (FK) │──┐
                            │   │ seatNumber      │  │
                            │   │ category        │  │
                            │   │ price           │  │
                            │   │ status          │  │
                            │   │ holdUntil       │  │
                            │   │ userId (FK)     │  │
                            │   │ createdAt       │  │
                            │   │ updatedAt       │  │
                            │   └─────────────────┘  │
                            │                        │
                            │   ┌────────────────────┘
                            │   │
                            │   │ 1:N
                            │   │
                            │   ▼
                    ┌───────────────────┐
                    │   PARKINGSLOT     │
                    ├───────────────────┤
                    │ _id (PK)          │
                    │ showtimeId (FK)   │
                    │ slotNumber        │
                    │ vehicleType       │
                    │ price             │
                    │ status            │
                    │ holdUntil         │
                    │ userId (FK)       │
                    │ vehicleNumber     │
                    │ createdAt         │
                    │ updatedAt         │
                    └───────────────────┘


          Other Collections:
          
    ┌──────────────────┐     ┌──────────────────┐
    │ CONTACTMESSAGE   │     │   FAQQUESTION    │
    ├──────────────────┤     ├──────────────────┤
    │ _id (PK)         │     │ _id (PK)         │
    │ name             │     │ question         │
    │ email            │     │ answer           │
    │ subject          │     │ category         │
    │ message          │     │ createdAt        │
    │ status           │     │ updatedAt        │
    │ createdAt        │     └──────────────────┘
    └──────────────────┘
```

---

## 📊 Schema Designs

### **1. User Schema**

```javascript
// models/user.model.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  password: {
    type: String,
    required: false,  // Optional for OAuth users
    minlength: 6
  },
  phone: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        return !v || /^[+]?[\d\s\-\(\)]{10,15}$/.test(v);
      },
      message: 'Invalid phone number'
    }
  },
  profilePicture: {
    type: String,
    default: 'https://cdn.pixabay.com/.../blank-profile-picture.png'
  },
  isOAuthUser: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'staff', 'manager', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true  // Adds createdAt and updatedAt
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

export default mongoose.model('User', userSchema);
```

**Sample Document:**
```json
{
  "_id": "64user123abc456def",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "$2a$10$abcdef...",
  "phone": "+1234567890",
  "profilePicture": "https://...",
  "isOAuthUser": false,
  "role": "user",
  "isActive": true,
  "lastLogin": "2026-02-28T14:30:00.000Z",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2026-02-28T14:30:00.000Z"
}
```

---

### **2. Movie Schema**

```javascript
// models/movie.model.js
const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true
  },
  genre: {
    type: String,
    required: true
  },
  language: {
    type: [String],
    required: true
  },
  runtime: {
    type: String,
    required: false
  },
  releaseDate: {
    type: String,
    required: true
  },
  cast: {
    type: [String],
    required: true
  },
  crew: {
    director: { type: String, required: true },
    writer: { type: String, required: false },
    producer: { type: [String], required: false }
  },
  productionCompanies: {
    type: [String],
    required: false
  },
  musicBy: String,
  cinematography: String,
  editing: String,
  budget: String,
  summary: {
    type: String,
    required: true,
    maxlength: 1000
  },
  poster: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Released', 'Coming Soon'],
    required: true
  },
  ratings: {
    type: Number,
    required: false,
    default: 0,
    min: 0,
    max: 10
  },
  votes: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    required: false,
    default: 120
  }
}, { timestamps: true });

// Virtual field for showtimes (populated separately)
movieSchema.virtual('showtimes', {
  ref: 'Showtime',
  localField: '_id',
  foreignField: 'movieId'
});

movieSchema.index({ title: 'text', genre: 'text' });

export default mongoose.model('Movie', movieSchema);
```

**Sample Document:**
```json
{
  "_id": "64movie123abc456def",
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
    "producer": ["Emma Thomas"]
  },
  "summary": "A thief who steals corporate secrets...",
  "poster": "https://cloudinary.com/.../inception.jpg",
  "status": "Released",
  "ratings": 8.8,
  "votes": 2500000,
  "duration": 148,
  "createdAt": "2025-01-10T08:00:00.000Z",
  "updatedAt": "2026-02-28T12:00:00.000Z"
}
```

---

### **3. Showtime Schema**

```javascript
// models/showtime.model.js
const showtimeSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
    index: true
  },
  screen: {
    type: String,
    required: true,
    enum: ['Screen 1', 'Screen 2', 'Screen 3', 'Screen 4']
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  cutoffMinutes: {
    type: Number,
    default: 15
  }
}, { timestamps: true });

// Compound index to prevent overlapping showtimes
showtimeSchema.index({ 
  screen: 1, 
  startTime: 1, 
  endTime: 1 
}, { unique: true });

export default mongoose.model('Showtime', showtimeSchema);
```

**Sample Document:**
```json
{
  "_id": "64showtime123abc456",
  "movieId": "64movie123abc456def",
  "screen": "Screen 1",
  "startTime": "2026-02-28T14:00:00.000Z",
  "endTime": "2026-02-28T16:30:00.000Z",
  "date": "2026-02-28T00:00:00.000Z",
  "isArchived": false,
  "cutoffMinutes": 15,
  "createdAt": "2026-02-27T00:00:00.000Z",
  "updatedAt": "2026-02-28T12:00:00.000Z"
}
```

---

### **4. Seat Schema**

```javascript
// models/seat.model.js
export const SeatStatus = {
  AVAILABLE: 'AVAILABLE',
  HELD: 'HELD',
  SOLD: 'SOLD'
};

const seatSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  showtimeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  seatNumber: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Gold', 'Platinum', 'Silver', 'Diamond', 'Balcony'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: Object.values(SeatStatus),
    default: SeatStatus.AVAILABLE,
    index: true
  },
  holdUntil: {
    type: Date,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Compound index to ensure unique seats per showtime
seatSchema.index({ showtimeId: 1, seatNumber: 1 }, { unique: true });

export default mongoose.model('Seat', seatSchema);
```

**Sample Document:**
```json
{
  "_id": "64seat123abc456def",
  "movieId": "64movie123abc456def",
  "showtimeId": "64showtime123abc456",
  "seatNumber": "A1",
  "category": "Gold",
  "price": 150,
  "status": "AVAILABLE",
  "holdUntil": null,
  "userId": null,
  "createdAt": "2026-02-27T00:00:00.000Z",
  "updatedAt": "2026-02-28T14:30:00.000Z"
}
```

---

### **5. Booking Schema**

```javascript
// models/booking.js
const bookingSchema = new mongoose.Schema({
  movieId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Movie', 
    required: true,
    index: true
  },
  showtimeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    index: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  seats: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Seat' 
  }],
  seatIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Seat' 
  }],
  parkingSlots: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ParkingSlot' 
  }],
  totalCost: { 
    type: Number, 
    required: true,
    min: 0
  },
  paymentStatus: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'FAILED'], 
    default: 'PENDING',
    index: true
  },
  paymentIntentId: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'cash', 'demo'],
    default: 'demo'
  },
  phone: { 
    type: String, 
    required: false 
  },
  bookingReference: {
    type: String,
    default: function() {
      return Math.random().toString(36).substring(2, 8).toUpperCase() + 
             Date.now().toString(36).substring(4);
    },
    unique: true
  }
}, { timestamps: true });

bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ bookingReference: 1 });

export default mongoose.model('Booking', bookingSchema);
```

**Sample Document:**
```json
{
  "_id": "64booking123abc456",
  "movieId": "64movie123abc456def",
  "showtimeId": "64showtime123abc456",
  "userId": "64user123abc456def",
  "seatIds": ["64seat1", "64seat2"],
  "parkingSlotIds": ["64park1"],
  "totalCost": 450,
  "paymentStatus": "COMPLETED",
  "paymentIntentId": "pi_stripe123456",
  "paymentMethod": "stripe",
  "phone": "+1234567890",
  "bookingReference": "A7F2P9",
  "createdAt": "2026-02-28T14:30:00.000Z",
  "updatedAt": "2026-02-28T14:30:00.000Z"
}
```

---

## 🔗 Relationships & References

### **Relationship Types Used**

#### **1. One-to-Many (1:N)**
```javascript
// User ──< Bookings
User.findById(userId).then(user => {
  // To get user's bookings:
  Booking.find({ userId: user._id });
});

// Movie ──< Showtimes
Movie.findById(movieId).then(movie => {
  // To get movie's showtimes:
  Showtime.find({ movieId: movie._id });
});
```

#### **2. Many-to-One (N:1)**
```javascript
// Booking >── Movie
Booking.findById(bookingId)
  .populate('movieId')  // Populate movie details
  .then(booking => {
    console.log(booking.movieId.title);
  });
```

#### **3. Many-to-Many (N:M)**
```javascript
// Booking ──< >── Seats
// Implemented via array of references

Booking.findById(bookingId)
  .populate('seatIds')
  .then(booking => {
    booking.seatIds.forEach(seat => {
      console.log(seat.seatNumber);
    });
  });
```

### **Reference Types**

#### **Embedded Documents (Denormalization)**
```javascript
// crew is embedded in Movie
{
  "crew": {
    "director": "Christopher Nolan",
    "writer": "Christopher Nolan",
    "producer": ["Emma Thomas"]
  }
}
```

**When to embed:**
- Data that doesn't change frequently
- Data that's always accessed together
- Small subdocuments

#### **Referenced Documents (Normalization)**
```javascript
// movieId is referenced in Showtime
{
  "movieId": ObjectId("64movie123abc456def")
}
```

**When to reference:**
- Large documents
- Data accessed independently
- Many-to-many relationships
- Frequently updated data

---

## 📈 Indexes & Optimization

### **Indexes Created**

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| User | `email: 1` | Single | Unique login lookup |
| User | `username: 1` | Single | Unique username check |
| Movie | `title: text, genre: text` | Text | Search functionality |
| Showtime | `movieId: 1` | Single | Find showtimes for movie |
| Showtime | `date: 1` | Single | Date-based queries |
| Showtime | `{screen: 1, startTime: 1}` | Compound | Prevent overlaps |
| Seat | `showtimeId: 1` | Single | Get seats for showtime |
| Seat | `{showtimeId: 1, seatNumber: 1}` | Compound | Unique constraint |
| Booking | `userId: 1` | Single | User's booking history |
| Booking | `createdAt: -1` | Single | Recent bookings first |
| Booking | `bookingReference: 1` | Single | Quick reference lookup |

### **Query Optimization Examples**

#### **Without Index:**
```javascript
// Full collection scan - SLOW
db.seats.find({ showtimeId: "64showtime123" })
// Examines: 100,000 documents
// Returns: 100 documents
// Time: ~500ms
```

#### **With Index:**
```javascript
// Index scan - FAST
db.seats.find({ showtimeId: "64showtime123" })
// Examines: 100 documents
// Returns: 100 documents
// Time: ~5ms
```

### **Compound Index Benefits**

```javascript
// Compound index: { screen: 1, startTime: 1, endTime: 1 }

// This query uses the index:
Showtime.find({ 
  screen: 'Screen 1', 
  startTime: { $gte: tomorrow } 
});

// This query also uses the index:
Showtime.find({ screen: 'Screen 1' });

// This query does NOT use the index (startTime not first):
Showtime.find({ startTime: { $gte: tomorrow } });
```

---

## 🌊 Data Flow

### **Booking Creation Data Flow**

```
1. User selects seats (Frontend)
        ↓
2. POST /api/seats/hold
   - Seat.updateMany({ _id: {$in: seatIds} }, { status: 'HELD', userId })
        ↓
3. User completes payment
        ↓
4. POST /api/bookings (Backend starts transaction)
        ↓
5. Verify seats still held
   - Seat.find({ _id: {$in: seatIds}, status: 'HELD', userId })
        ↓
6. Update seats to SOLD
   - Seat.updateMany({ _id: {$in: seatIds} }, { status: 'SOLD' })
        ↓
7. Create booking
   - new Booking({movieId, showtimeId, userId, seatIds, totalCost})
   - booking.save()
        ↓
8. Commit transaction
        ↓
9. Emit Socket.IO event
   - io.to(`showtime-${showtimeId}`).emit('seatsUpdated')
        ↓
10. Send confirmation email
    - emailService.sendBookingEmail()
```

### **Showtime Generation Cron Job**

```
Cron trigger (Daily at midnight)
        ↓
1. Get today's date
        ↓
2. Check if showtimes for tomorrow exist
   - Showtime.find({ date: tomorrow })
        ↓
3. If not exist, generate showtimes
        ↓
4. For each movie:
   - For each screen:
     - Calculate time slots
     - Create Showtime document
     - Save to database
        ↓
5. For each new showtime:
   - Generate seats (150 seats per showtime)
   - Create Seat documents
   - Bulk insert: Seat.insertMany()
        ↓
6. Log completion
```

---

## 📐 Normalization Analysis

### **Current Normalization Level: 3NF (Third Normal Form)**

#### **1NF (First Normal Form)** ✅
- All attributes contain atomic values
- No repeating groups

#### **2NF (Second Normal Form)** ✅
- In 1NF
- All non-key attributes fully dependent on primary key

#### **3NF (Third Normal Form)** ✅
- In 2NF
- No transitive dependencies

### **Normalization Examples**

#### **Normalized (Current):**
```json
// User collection
{
  "_id": "user123",
  "username": "johndoe",
  "email": "john@example.com"
}

// Booking collection
{
  "_id": "booking123",
  "userId": "user123",  // Reference to User
  "movieId": "movie456"
}
```

#### **Denormalized (Alternative):**
```json
// Booking with embedded user data
{
  "_id": "booking123",
  "user": {
    "username": "johndoe",
    "email": "john@example.com"  // Duplicated data
  },
  "movieId": "movie456"
}
```

### **Strategic Denormalization**

**Where we denormalized:**
1. **Movie.crew** - Embedded object (director, writer, producer)
2. **Movie.cast** - Embedded array
3. **Movie.language** - Embedded array

**Why?**
- This data is always accessed together
- Rare updates
- Avoids joins for every movie query
- Improves read performance

---

## 📊 Scalability Considerations

### **Current Limitations**

1. **Single Database Server**
   - All queries hit one MongoDB instance
   - Limited by single server resources

2. **No Read Replicas**
   - Can't distribute read load
   - No automatic failover

3. **No Sharding**
   - Limited by single server capacity
   - Can't horizontally scale writes

### **Scaling Strategies**

#### **Phase 1: Vertical Scaling**
```
Upgrade MongoDB Atlas tier
- More RAM
- More CPU
- Faster disk I/O
```

#### **Phase 2: Read Replicas**
```
Primary (writes) ──> Secondary 1 (reads)
                 └──> Secondary 2 (reads)
                 └──> Secondary 3 (reads)
```

**Implementation:**
```javascript
// Connection string for replica set
const uri = "mongodb+srv://.../?replicaSet=cinema-rs&readPreference=secondaryPreferred";
```

#### **Phase 3: Sharding**
```
Shard Key: userId or date

Shard 1: Users A-M
Shard 2: Users N-Z

OR

Shard 1: Bookings Jan-Jun
Shard 2: Bookings Jul-Dec
```

### **Caching Strategy**

```javascript
// Redis cache for hot data
import Redis from 'ioredis';
const redis = new Redis();

// Cache movie list (rarely changes)
export const getMovies = async () => {
  const cached = await redis.get('movies:all');
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const movies = await Movie.find();
  await redis.set('movies:all', JSON.stringify(movies), 'EX', 3600); // 1 hour
  
  return movies;
};
```

---

## 🎓 Interview Q&A

### **Q1: Why MongoDB over PostgreSQL?**

**Answer**: "I chose MongoDB because:
1. **Schema flexibility** - Movie and booking data can evolve
2. **JavaScript ecosystem** - Natural fit with Node.js
3. **Horizontal scaling** - Sharding support
4. **Development speed** - No need to define rigid schemas upfront
5. **Document model** - Movies with nested crew/cast data fit well

However, I recognize PostgreSQL would be better if:
- Heavy transactional requirements
- Complex reporting queries
- Strong consistency critical
- Team expertise in SQL"

### **Q2: How do you ensure data consistency?**

**Answer**: "Multiple approaches:
1. **Mongoose schema validation** - Type checking and constraints
2. **Unique indexes** - Prevent duplicate emails/usernames/seat bookings
3. **Transactions** - For booking operations
4. **Application-level validation** - express-validator on APIs
5. **Referential integrity** - Handled at application level, not DB level unlike SQL"

### **Q3: Explain your indexing strategy**

**Answer**: "I created indexes based on query patterns:
1. **User lookup** - email and username (for authentication)
2. **Showtime queries** - movieId, date (for browsing)
3. **Seat availability** - showtimeId (for booking page)
4. **Booking history** - userId, createdAt (for user profile)
5. **Text search** - title, genre (for movie search)

I use `explain()` in MongoDB to verify indexes are used:
```javascript
db.seats.find({ showtimeId: '123' }).explain('executionStats')
```

### **Q4: How do you handle relationships in MongoDB?**

**Answer**: "I use a hybrid approach:
- **Embed** for tightly coupled data (Movie.crew)
- **Reference** for independent entities (Booking → User)
- **Denormalize** strategically for read optimization

For example, Booking references userId (not embed) because:
- User data is large
- User data changes independently
- Not all bookings need full user info"

### **Q5: What's your database backup strategy?**

**Answer**: "Using MongoDB Atlas automated backups:
1. **Continuous backups** - Point-in-time recovery
2. **Snapshot frequency** - Every 6 hours
3. **Retention** - 7 days for free tier
4. **Testing** - Periodic restore drills

For production, I'd also implement:
- Application-level backup scripts
- Export critical data to separate storage
- Multi-region replication"

---

**Next:** [SECURITY_ANALYSIS.md](./SECURITY_ANALYSIS.md)
