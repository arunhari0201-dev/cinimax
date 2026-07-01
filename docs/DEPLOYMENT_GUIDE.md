# 🚀 DEPLOYMENT GUIDE

## 📋 Table of Contents
1. [Deployment Overview](#deployment-overview)
2. [Environment Setup](#environment-setup)
3. [MongoDB Atlas Configuration](#mongodb-atlas-configuration)
4. [Backend Deployment (Render)](#backend-deployment-render)
5. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
6. [Domain Configuration](#domain-configuration)
7. [Environment Variables](#environment-variables)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Deployment Overview

### **Current Production Setup**

| Component | Platform | URL | Status |
|-----------|----------|-----|--------|
| Frontend | Vercel | https://www.cinexp.app | ✅ Live |
| Backend | Render | https://cinimax.onrender.com | ✅ Live |
| Database | MongoDB Atlas | (hidden) | ✅ Live |
| CDN | Cloudinary | (for images) | ✅ Live |
| Payments | Stripe | (sandbox/live) | ✅ Live |

### **Architecture Diagram**

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓ HTTPS
┌─────────────────┐
│  Vercel (CDN)   │ ← React App (cinexp.app)
│  Frontend       │
└────────┬────────┘
         │
         ↓ API Calls
┌─────────────────┐
│    Render       │ ← Express App (cinimax.onrender.com)
│    Backend      │
└────┬───────┬────┘
     │       │
     │       ↓ WebSocket
     │    Socket.IO
     │
     ↓ Mongoose
┌─────────────────┐
│ MongoDB Atlas   │
│   Database      │
└─────────────────┘
```

---

## 🔧 Environment Setup

### **Prerequisites**

```bash
# Required tools
- Node.js v18+ and npm
- Git
- MongoDB Atlas account
- Vercel account
- Render account
- Cloudinary account
- Stripe account
- Domain registrar access (for custom domain)
```

### **Local Development Setup**

```bash
# 1. Clone repository
git clone <repository-url>
cd mern-auth

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd client
npm install
cd ..

# 4. Create environment files
# Backend: .env in root
# Frontend: .env in client/

# 5. Start development
npm run dev  # Starts both frontend and backend
```

---

## 🗄️ MongoDB Atlas Configuration

### **Step 1: Create Cluster**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign in / Create account
3. **Create New Project** → "CinematicPopcornPark"
4. **Build a Database** → Choose plan:
   - **Free Tier (M0)**: Development/Testing
   - **Shared (M2/M5)**: Small production
   - **Dedicated**: High traffic production

### **Step 2: Configure Cluster**

```yaml
Provider: AWS / GCP / Azure
Region: Choose closest to backend (Render uses US-East)
Cluster Name: CinemaCluster
MongoDB Version: 6.0+
```

### **Step 3: Security Configuration**

#### **Database Access**
```
User: admin_user
Password: <generate strong password>
Privileges: Atlas admin (or read/write on specific database)
```

#### **Network Access**
```
# Development
IP Address: 0.0.0.0/0 (Allow from anywhere)

# Production (Better security)
IP Address: <Render IP addresses>
IP Address: <Your office IP>
```

Right-click on your IP → **Add Current IP Address**

### **Step 4: Get Connection String**

```
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy connection string:
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority

4. Replace:
   - <username> with your DB user
   - <password> with your DB password
   - <dbname> with "cinema_booking" (or your DB name)
```

### **Step 5: Database Setup**

```javascript
// Collections are auto-created by Mongoose, but you can create manually:

// Collections:
- users
- movies
- showtimes
- seats
- bookings
- parkingslots
- confirmpayments
- contactmessages
- faqquestions

// Indexes (Mongoose creates these automatically from schema)
```

### **Step 6: Enable Backup (Recommended)**

```
Project Settings → Backup
Enable Continuous Cloud Backup
Retention: 7 days minimum
```

---

## 🖥️ Backend Deployment (Render)

### **Step 1: Prepare for Deployment**

```json
// package.json - Ensure these scripts exist
{
  "scripts": {
    "start": "node api/index.js",
    "dev": "nodemon api/index.js",
    "build": "npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### **Step 2: Create Render Web Service**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. **New** → **Web Service**
3. Connect GitHub repository
4. Configure:

```yaml
Name: cinema-backend
Environment: Node
Region: Oregon (US West) or closest to you
Branch: main
Root Directory: (leave blank if root, or "api" if backend in subfolder)
Build Command: npm install
Start Command: node api/index.js
Plan: Free (for testing) or Starter ($7/mo)
```

### **Step 3: Environment Variables**

Add in Render dashboard under **Environment**:

```env
NODE_ENV=production
PORT=10000
MONGO=mongodb+srv://user:pass@cluster.mongodb.net/cinema_booking
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
JWT_REFRESH_SECRET=another-secret-for-refresh-tokens

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_... (use sk_test_... for testing)
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email (Nodemailer with Gmail)
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-specific-password

# Frontend URL (for CORS)
CLIENT_URL=https://www.cinexp.app

# Firebase Admin (for OAuth)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### **Step 4: Deploy**

```
Render automatically deploys when you push to main branch

Manual Deploy:
- Click "Manual Deploy" → "Deploy latest commit"
```

### **Step 5: Configure Health Check**

```yaml
Health Check Path: /api/health (create this endpoint)
```

Add health endpoint:
```javascript
// api/index.js
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### **Step 6: Custom Domain (Optional)**

```
Render Dashboard → Settings → Custom Domain
Add: api.cinexp.app

Update DNS:
CNAME api.cinexp.app → your-app.onrender.com
```

---

## 🌐 Frontend Deployment (Vercel)

### **Step 1: Prepare Frontend**

```javascript
// client/vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,  // Disable in production for security
    minify: 'terser'
  }
});
```

```json
// client/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### **Step 2: Create vercel.json**

```json
// client/vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### **Step 3: Deploy to Vercel**

#### **Option A: Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd client
vercel

# Production deployment
vercel --prod
```

#### **Option B: GitHub Integration**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. **Add New Project**
3. **Import Git Repository**
4. Select your repo
5. Configure:

```yaml
Framework Preset: Vite
Root Directory: client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### **Step 4: Environment Variables**

Add in Vercel dashboard under **Settings** → **Environment Variables**:

```env
VITE_API_BASE_URL=https://cinimax.onrender.com
VITE_SOCKET_URL=https://cinimax.onrender.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
```

**Note:** Prefix all frontend variables with `VITE_` for Vite to expose them.

### **Step 5: Custom Domain**

```
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add Domain: www.cinexp.app
3. Configure DNS:

DNS Records:
A Record:      @              → 76.76.21.21 (Vercel IP)
A Record:      www            → 76.76.21.21
CNAME:         www.cinexp.app → cname.vercel-dns.com
```

Wait for SSL certificate (automatic, takes ~5 minutes).

---

## 🌍 Domain Configuration

### **Full DNS Setup**

```dns
# Main domain
A     @              3600   76.76.21.21 (Vercel)
A     www            3600   76.76.21.21

# API subdomain
CNAME api            3600   cinema-backend.onrender.com

# Email (if using custom email)
MX    @              3600   10 mail.cinexp.app
```

### **SSL/HTTPS**

- **Vercel**: Automatic SSL via Let's Encrypt
- **Render**: Automatic SSL via Let's Encrypt
- Both platforms handle certificate renewal automatically

---

## 🔐 Environment Variables Reference

### **Backend (.env)**

```env
# Server
NODE_ENV=production
PORT=10000

# Database
MONGO=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=minimum-32-character-secret-key-here
JWT_REFRESH_SECRET=another-32-character-key-for-refresh

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456ghi789

# Stripe
STRIPE_SECRET_KEY=sk_live_51ABC...
STRIPE_PUBLISHABLE_KEY=pk_live_51ABC...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
MAIL_USER=noreply@cinexp.app
MAIL_PASS=app-specific-password

# CORS
CLIENT_URL=https://www.cinexp.app

# Firebase Admin SDK
FIREBASE_PROJECT_ID=cinema-booking-app
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@cinema-booking-app.iam.gserviceaccount.com
```

### **Frontend (client/.env)**

```env
# API
VITE_API_BASE_URL=https://cinimax.onrender.com
VITE_SOCKET_URL=https://cinimax.onrender.com

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51ABC...

# Firebase
VITE_FIREBASE_API_KEY=AIzaSyABC123...
VITE_FIREBASE_AUTH_DOMAIN=cinema-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cinema-app
VITE_FIREBASE_STORAGE_BUCKET=cinema-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123
```

---

## 🔄 CI/CD Pipeline

### **Current Setup (Basic)**

```
Git Push → GitHub → Auto-deploy on Vercel/Render
```

### **Enhanced CI/CD with GitHub Actions**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Lint code
        run: npm run lint

  test-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy-backend:
    needs: [test-backend, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Render
        run: |
          curl -X POST https://api.render.com/deploy/srv-xxx?key=${{ secrets.RENDER_DEPLOY_HOOK }}

  deploy-frontend:
    needs: [test-frontend, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### **GitHub Secrets to Add**

```
Settings → Secrets and variables → Actions → New repository secret

- RENDER_DEPLOY_HOOK
- VERCEL_TOKEN
- SNYK_TOKEN
- VITE_API_BASE_URL
- (other sensitive env vars)
```

---

## 📊 Monitoring & Logging

### **1. Render Monitoring**

```
Render Dashboard → Your Service → Metrics
- CPU usage
- Memory usage
- Request count
- Response times
```

**Set up Alerts:**
```
Settings → Notifications
- Deployment failures
- High CPU/memory
- Service crashes
```

### **2. Application Logging**

```javascript
// api/index.js - Add logging middleware
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

// Log to file in production
if (process.env.NODE_ENV === 'production') {
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev'));
}

// Error logging
app.use((err, req, res, next) => {
  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id
  });
  res.status(err.statusCode || 500).json({ message: err.message });
});
```

### **3. External Monitoring (Recommended)**

**Sentry for Error Tracking:**
```bash
npm install @sentry/node @sentry/integrations

# Initialize in api/index.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**LogTail / Papertrail:**
- Real-time log aggregation
- Searchable logs
- Alerts on errors

**Uptime Monitoring:**
- UptimeRobot
- Pingdom
- Check every 5 minutes

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. "Cannot connect to MongoDB"**

```
Error: MongooseServerSelectionError

Solutions:
✓ Check MongoDB Atlas connection string
✓ Verify IP whitelisting (0.0.0.0/0 or specific IPs)
✓ Ensure database user exists with correct password
✓ Check network access settings in Atlas
✓ Verify database name in connection string
```

#### **2. "CORS Error"**

```
Error: Access to XMLHttpRequest has been blocked by CORS policy

Solutions:
✓ Check backend CORS origin includes frontend URL
✓ Ensure credentials: true on both frontend and backend
✓ Verify no trailing slashes in URLs
✓ Check if using correct protocol (http vs https)

// backend
app.use(cors({
  origin: 'https://www.cinexp.app',  // No trailing slash
  credentials: true
}));

// frontend
axios.get(url, { withCredentials: true });
```

#### **3. "Environment variables not loading"**

```
Frontend (Vite):
✓ Must prefix with VITE_
✓ Restart dev server after adding variables
✓ Check .env file is in client/ directory

Backend:
✓ Check .env is in root directory
✓ Verify dotenv is loaded: require('dotenv').config()
✓ Restart server after changes
```

#### **4. "Socket.IO connection failed"**

```
Error: WebSocket connection failed

Solutions:
✓ Check Socket.IO URL matches backend URL
✓ Verify backend supports WebSocket upgrades
✓ Check firewall/proxy doesn't block WebSocket
✓ Ensure transports configured: ['websocket', 'polling']

// Backend
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL },
  transports: ['websocket', 'polling']
});

// Frontend
const socket = io(serverURL, {
  withCredentials: true,
  transports: ['websocket', 'polling']
});
```

#### **5. "Render service keeps sleeping"**

```
Issue: Free tier spins down after 15 minutes of inactivity

Solutions:
✓ Upgrade to paid plan ($7/mo for always-on)
✓ Use cron job to ping server every 10 minutes
✓ Implement warming service (UptimeRobot with 5-min checks)

// Add to separate service
setInterval(() => {
  fetch('https://cinimax.onrender.com/api/health');
}, 10 * 60 * 1000);  // Every 10 minutes
```

#### **6. "Build fails on Vercel"**

```
Solutions:
✓ Check build command: vite build
✓ Verify output directory: dist
✓ Ensure all dependencies in package.json
✓ Check for TypeScript errors
✓ Review build logs for specific error

// Add to package.json
"engines": {
  "node": ">=18.0.0"
}
```

---

## 📝 Post-Deployment Checklist

### **Functional Testing**
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Google OAuth works
- [ ] Movie listings display
- [ ] Seat selection works
- [ ] Real-time updates functional
- [ ] Payment flow completes
- [ ] Booking confirmation received
- [ ] Admin panel accessible
- [ ] Email notifications sent

### **Performance**
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Images optimized and loading fast
- [ ] No console errors
- [ ] Mobile responsive

### **Security**
- [ ] HTTPS working
- [ ] Security headers present
- [ ] No exposed secrets in frontend
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Authentication working
- [ ] Authorization enforced

### **Monitoring**
- [ ] Error tracking configured
- [ ] Uptime monitoring active
- [ ] Logs accessible
- [ ] Alerts configured
- [ ] Backup strategy in place

---

## 🎓 Interview Talking Points

**"Walk me through your deployment process"**

"I use a JAMstack approach with Vercel for the React frontend and Render for the Node backend. MongoDB is hosted on Atlas with automated backups. 

The deployment is automated via Git - pushing to main branch triggers builds on both platforms. Vercel builds the React app with Vite, optimizes assets, and deploys to their global CDN. Render pulls the latest code, installs dependencies, and starts the Express server.

Environment variables are managed separately on each platform for security. The frontend connects to the backend via HTTPS with proper CORS configuration. Socket.IO handles real-time features over WebSocket connections.

For production, I've configured health checks, monitoring, and error tracking with Sentry. SSL certificates are automatically managed by both platforms."

**"How do you handle environment differences?"**

"I use NODE_ENV to distinguish environments. Development uses local servers and test Stripe keys. Production uses environment variables for all secrets - MongoDB connection strings, JWT secrets, API keys, etc.

Frontend uses Vite's VITE_ prefix for environment variables. I maintain separate .env files that are gitignored, and configure production variables directly in Vercel/Render dashboards.

Database uses the same MongoDB Atlas cluster but different databases for dev/staging/prod to isolate data."

**"What's your rollback strategy?"**

"Vercel and Render both maintain deployment history. If an issue occurs, I can rollback to the previous version instantly from their dashboards. For the database, MongoDB Atlas provides point-in-time restore with continuous backups.

For more control, I'd implement blue-green deployments or canary releases, gradually rolling out changes to a subset of users before full deployment."

---

**Next:** [PERFORMANCE_REPORT.md](./PERFORMANCE_REPORT.md)
