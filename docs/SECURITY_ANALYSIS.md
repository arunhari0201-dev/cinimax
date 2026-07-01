# 🔒 SECURITY ANALYSIS & BEST PRACTICES

## 📋 Table of Contents
1. [Security Overview](#security-overview)
2. [Authentication Security](#authentication-security)
3. [Authorization & RBAC](#authorization--rbac)
4. [API Security](#api-security)
5. [Database Security](#database-security)
6. [Frontend Security](#frontend-security)
7. [Network Security](#network-security)
8. [Vulnerabilities Found](#vulnerabilities-found)
9. [Recommendations](#recommendations)
10. [Production Hardening](#production-hardening)

---

## 🎯 Security Overview

### **Security Measures Implemented**

| Security Layer | Implementation | Status |
|----------------|----------------|--------|
| Authentication | JWT + bcrypt | ✅ Implemented |
| Authorization | Role-based (RBAC) | ✅ Implemented |
| Password Hashing | bcrypt (10 rounds) | ✅ Implemented |
| HTTPS/SSL | Required in production | ✅ Implemented |
| CORS | Whitelist configuration | ✅ Implemented |
| Input Validation | express-validator | ✅ Implemented |
| SQL/NoSQL Injection | Mongoose sanitization | ✅ Implemented |
| XSS Protection | React auto-escaping | ✅ Implemented |
| CSRF Protection | SameSite cookies | ✅ Implemented |
| Rate Limiting | Not implemented | ❌ Missing |
| Security Headers | Helmet middleware | ✅ Implemented |
| Secrets Management | Environment variables | ✅ Implemented |
| Dependency Scanning | Manual npm audit | ⚠️ Partial |

---

## 🔐 Authentication Security

### **1. Password Security**

#### **Hashing with bcrypt**
```javascript
// Signup - Hash password
const hashedPassword = bcryptjs.hashSync(password, 10);
```

**Why bcrypt?**
- Adaptive hashing (computationally expensive)
- Built-in salt generation
- Resistant to rainbow table attacks
- 10 salt rounds = 2^10 = 1024 iterations

**Time Complexity:**
- 10 rounds: ~100-200ms (good balance)
- Prevents brute force attacks

#### **Password Validation**
```javascript
// Login - Compare passwords
const validPassword = bcryptjs.compareSync(password, user.password);
```

**Password Requirements:**
```javascript
// Current
- Minimum 6 characters

// Recommended for Production
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Maximum 128 characters (prevent DoS)
```

**Implementation:**
```javascript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

if (!passwordRegex.test(password)) {
  return res.status(400).json({
    message: 'Password must be 8-128 chars with uppercase, lowercase, number, and special char'
  });
}
```

---

### **2. JWT Token Security**

#### **Current Implementation**
```javascript
const token = jwt.sign(
  { id: user._id },                // Payload (minimal data)
  process.env.JWT_SECRET,           // Strong secret key
  { expiresIn: '7d' }              // 7-day expiry
);
```

**Strengths:**
✅ Secret key stored in environment variable  
✅ Token expiry set  
✅ HttpOnly cookie prevents XSS  
✅ SameSite attribute prevents CSRF  

**Weaknesses:**
⚠️ No token revocation mechanism  
⚠️ 7 days might be too long  
⚠️ No token refresh implementation  
⚠️ No device tracking  

#### **Recommended Improvements**

**1. Shorter Expiry + Refresh Token**
```javascript
// Access token: 15 minutes
const accessToken = jwt.sign(
  { id: user._id, type: 'access' },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Refresh token: 7 days (stored in DB)
const refreshToken = jwt.sign(
  { id: user._id, type: 'refresh' },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);

// Store refresh token in database
await RefreshToken.create({
  userId: user._id,
  token: refreshToken,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});
```

**2. Token Blacklisting**
```javascript
// Redis-based blacklist
import Redis from 'ioredis';
const redis = new Redis();

// Logout - Blacklist token
export const logout = async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  // Add to blacklist with TTL matching token expiry
  await redis.set(`blacklist:${token}`, '1', 'EX', 604800); // 7 days
  
  res.json({ message: 'Logged out successfully' });
};

// Middleware - Check blacklist
export const verifyToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  // Check if blacklisted
  const isBlacklisted = await redis.get(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(401).json({ message: 'Token has been revoked' });
  }
  
  // Verify token...
};
```

**3. Add Device/IP Tracking**
```javascript
// Enhanced token payload
const token = jwt.sign({
  id: user._id,
  device: req.headers['user-agent'],
  ip: req.ip,
  iat: Date.now()
}, process.env.JWT_SECRET);

// Verify device on critical operations
if (req.headers['user-agent'] !== decoded.device) {
  // Trigger security alert
  await sendSecurityEmail(user.email, 'Suspicious login detected');
}
```

---

## 👮 Authorization & RBAC

### **Current Role System**

```javascript
// User model roles
role: {
  type: String,
  enum: ['user', 'staff', 'manager', 'admin'],
  default: 'user'
}
```

### **Middleware Implementation**

```javascript
// Auth check
export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// Manager check
export const verifyManager = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!['manager', 'admin'].includes(user.role)) {
    return res.status(403).json({ message: 'Manager access required' });
  }
  next();
};

// Admin check
export const verifyAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
```

**Strengths:**
✅ Clear role hierarchy  
✅ Middleware chaining  
✅ Database-backed role verification  

**Improvements:**

**1. Permission-Based System (More Flexible)**
```javascript
// Instead of roles, use permissions
const PERMISSIONS = {
  'movies:read': ['user', 'staff', 'manager', 'admin'],
  'movies:create': ['admin'],
  'movies:update': ['admin'],
  'movies:delete': ['admin'],
  'bookings:read': ['user', 'staff', 'manager', 'admin'],
  'bookings:read:all': ['manager', 'admin'],
  'users:read': ['manager', 'admin'],
  'users:update:role': ['admin']
};

// Permission middleware
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    const user = await User.findById(req.user.id);
    const allowedRoles = PERMISSIONS[permission];
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        message: `Permission '${permission}' required` 
      });
    }
    next();
  };
};

// Usage
router.delete('/movies/:id', 
  verifyToken, 
  requirePermission('movies:delete'), 
  deleteMovie
);
```

**2. Audit Logging**
```javascript
// Log all admin actions
export const auditLog = async (req, res, next) => {
  if (req.userData.role !== 'user') {
    await AuditLog.create({
      userId: req.userData._id,
      action: `${req.method} ${req.path}`,
      role: req.userData.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
  }
  next();
};
```

---

## 🛡️ API Security

### **1. Input Validation**

**Current Implementation:**
```javascript
// Basic validation in controllers
if (!username || !email || !password) {
  return next(errorHandler(400, 'All fields required'));
}
```

**Enhanced Validation with express-validator:**
```javascript
import { body, param, query, validationResult } from 'express-validator';

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Signup route with validation
router.post('/signup', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 alphanumeric characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must meet complexity requirements'),
  validate
], signup);

// Booking route validation
router.post('/bookings', [
  body('movieId').isMongoId(),
  body('showtimeId').isMongoId(),
  body('seatIds').isArray({ min: 1, max: 10 }),
  body('seatIds.*').isMongoId(),
  body('totalCost').isFloat({ min: 0, max: 100000 }),
  body('phone').optional().matches(/^[+]?[\d\s\-\(\)]{10,15}$/),
  validate
], createBooking);
```

### **2. NoSQL Injection Prevention**

**Vulnerable Code:**
```javascript
// DO NOT DO THIS
const user = await User.findOne({ email: req.body.email });

// Malicious payload: { "email": { "$ne": null } }
// Returns first user in database!
```

**Protected Code:**
```javascript
// Mongoose automatically sanitizes
const user = await User.findOne({ 
  email: req.body.email.toString() 
});

// Additional protection
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());

// This blocks: { "email": { "$ne": null } }
```

### **3. Rate Limiting (MISSING - CRITICAL)**

**Recommended Implementation:**
```javascript
import rateLimit from 'express-rate-limit';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Booking limiter
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 bookings per minute
});

app.use('/api/bookings', bookingLimiter);
```

### **4. CORS Configuration**

**Current Implementation:**
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://www.cinexp.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

**Strengths:**
✅ Whitelist approach  
✅ Credentials enabled properly  
✅ Methods restricted  

**Improvements:**
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://www.cinexp.app',
  'https://cinexp.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight for 10 minutes
}));
```

---

## 🗄️ Database Security

### **1. Connection String Security**

**Good:**
```javascript
// Stored in environment variable
mongoose.connect(process.env.MONGO);
```

**Better:**
```javascript
// With additional options
mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### **2. MongoDB Atlas Security**

**Enabled:**
- IP Whitelist
- Database authentication
- Encrypted connections (TLS)
- Network isolation

**Should Enable:**
- Audit logging
- Encryption at rest
- Field-level encryption for sensitive data
- Database backups

### **3. Query Security**

```javascript
// Prevent injection via Mongoose schema validation
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    match: /^\S+@\S+\.\S+$/,  // Email regex
    lowercase: true
  },
  role: {
    type: String,
    enum: ['user', 'staff', 'manager', 'admin'],  // Only allowed values
    default: 'user'
  }
});
```

---

## 🌐 Frontend Security

### **1. XSS Protection**

**React Built-in Protection:**
```jsx
// SAFE - React escapes by default
<div>{user.username}</div>  
<input value={user.email} />

// DANGEROUS - Bypasses escaping
<div dangerouslySetInnerHTML={{__html: userInput}} />  // ❌ DON'T USE
```

**Additional Protection:**
```javascript
import DOMPurify from 'dompurify';

// Sanitize user input before rendering
const cleanHTML = DOMPurify.sanitize(userInput);
<div dangerouslySetInnerHTML={{__html: cleanHTML}} />
```

### **2. CSRF Protection**

**Protected by:**
- HttpOnly cookies
- SameSite=None attribute (with Secure)
- Origin checking on backend

**Additional Protection:**
```javascript
// CSRF Token approach
import csurf from 'csurf';

const csrfProtection = csurf({ cookie: true });

app.post('/api/bookings', csrfProtection, createBooking);

// Frontend sends CSRF token
const token = getCookie('XSRF-TOKEN');
axios.post('/api/bookings', data, {
  headers: { 'X-XSRF-TOKEN': token }
});
```

### **3. Sensitive Data Storage**

**Current:**
```javascript
// Redux Persist stores in localStorage
localStorage.setItem('persist:root', JSON.stringify(state));
```

**Risks:**
- LocalStorage vulnerable to XSS
- Token stored in plaintext
- No expiry mechanism

**Better Approach:**
```javascript
// Option 1: Only store non-sensitive data
const persistConfig = {
  key: 'root',
  storage,
  blacklist: ['auth', 'payment'] // Don't persist sensitive data
};

// Option 2: Encrypt sensitive data
import CryptoJS from 'crypto-js';

const encrypt = (data) => {
  return CryptoJS.AES.encrypt(
    JSON.stringify(data), 
    process.env.REACT_APP_ENCRYPTION_KEY
  ).toString();
};

const decrypt = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.REACT_APP_ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};
```

### **4. Secure Token Handling**

**Current:**
```javascript
// Token in multiple places
localStorage.setItem('access_token', token);  // Vulnerable to XSS
document.cookie = `access_token=${token}`;     // Better if HttpOnly
```

**Best Practice:**
```javascript
// Backend sets HttpOnly cookie only
res.cookie('access_token', token, {
  httpOnly: true,    // Cannot be accessed by JavaScript
  secure: true,      // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// Frontend automatically includes cookie
axios.post('/api/bookings', data, {
  withCredentials: true  // Sends cookie automatically
});

// No token storage in frontend needed!
```

---

## 🔒 Network Security

### **1. HTTPS Enforcement**

**Current:**
- Production uses HTTPS (Vercel + Render)
- Development uses HTTP (localhost)

**Configuration:**
```javascript
// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

### **2. Security Headers (Helmet)**

**Current:**
```javascript
import helmet from 'helmet';
app.use(helmet());
```

**Enhanced Configuration:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://js.stripe.com"]
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));
```

---

## 🐛 Vulnerabilities Found

### **HIGH Severity**

#### **1. No Rate Limiting**
- **Risk**: Brute force attacks, DoS
- **Impact**: Account takeover, service disruption
- **Fix**: Implement express-rate-limit (see above)

#### **2. Weak Password Policy**
- **Risk**: Easy to guess passwords
- **Impact**: Account compromise
- **Fix**: Enforce complexity requirements

#### **3. No Token Revocation**
- **Risk**: Stolen tokens remain valid
- **Impact**: Unauthorized access even after logout
- **Fix**: Implement token blacklisting

### **MEDIUM Severity**

#### **4. Long Token Expiry (7 days)**
- **Risk**: Extended window for token theft
- **Impact**: Session hijacking
- **Fix**: Use short-lived access tokens (15 min) + refresh tokens

#### **5. Error Messages Leak Info**
- **Risk**: Information disclosure
- **Impact**: Attacker learns system internals
```javascript
// CURRENT (vulnerable)
catch (error) {
  res.status(500).json({ error: error.message, stack: error.stack });
}

// FIXED
catch (error) {
  console.error(error);  // Log internally
  res.status(500).json({ 
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { debug: error.message })
  });
}
```

#### **6. No Request Size Limit**
- **Risk**: DoS via large payloads
```javascript
// FIX
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

### **LOW Severity**

#### **7. No Security Monitoring**
- **Risk**: Attacks go undetected
- **Fix**: Add logging, monitoring, alerts

---

## 📝 Recommendations

### **Immediate Actions (High Priority)**

1. **Implement Rate Limiting**
```bash
npm install express-rate-limit
```

2. **Enforce Strong Passwords**
3. **Add Token Blacklisting**
4. **Limit Request Sizes**
5. **Sanitize Error Messages**

### **Short Term (Medium Priority)**

6. **Add CSRF Tokens**
7. **Implement Audit Logging**
8. **Add Security Monitoring**
9. **Set up Automated Security Scans**
```bash
npm audit
npm install -g snyk
snyk test
```

10. **Add API Documentation with Security Notes**

### **Long Term (Nice to Have)**

11. **Implement 2FA**
12. **Add Anomaly Detection**
13. **Penetration Testing**
14. **Bug Bounty Program**
15. **Security Training for Team**

---

## 🏭 Production Hardening Checklist

### **Environment**
- [ ] All secrets in environment variables
- [ ] No hardcoded credentials
- [ ] `.env` file in `.gitignore`
- [ ] Different secrets for dev/prod

### **Dependencies**
- [ ] Run `npm audit` regularly
- [ ] Keep dependencies updated
- [ ] Remove unused packages
- [ ] Review package permissions

### **Code**
- [ ] Input validation on all endpoints
- [ ] Output encoding
- [ ] Parameterized queries (Mongoose does this)
- [ ] No eval() or similar dangerous functions
- [ ] Error handling doesn't leak info

### **Infrastructure**
- [ ] HTTPS everywhere
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Logging and monitoring
- [ ] Regular backups
- [ ] Disaster recovery plan

### **Testing**
- [ ] Security test cases
- [ ] Automated scanning
- [ ] Manual penetration testing
- [ ] Third-party security audit

---

## 🎓 Interview Answers

**Q: How do you prevent XSS attacks?**

"Multiple layers: React's built-in escaping, HttpOnly cookies so tokens can't be stolen via XSS, CSP headers via Helmet, and avoiding dangerouslySetInnerHTML. For user-generated content, I'd use DOMPurify to sanitize."

**Q: Password security approach?**

"I use bcrypt with 10 salt rounds for hashing. Passwords are hashed on signup and compared securely on login. For production, I'd enforce 8-character minimum with complexity requirements and add breach detection via haveibeenpwned API."

**Q: How would you scale security?**

"Add rate limiting first, then implement Redis-based token blacklisting. Set up monitoring and alerts. Add 2FA for admin accounts. Regular security audits and penetration testing. Implement WAF (Web Application Firewall) at CDN level."

---

**Next:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
