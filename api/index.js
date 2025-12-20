
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';

// Routes
import userRoutes from './routes/user.route.js';
import authRoutes from './routes/auth.route.js';
import movieRoutes from './routes/movie.route.js';
import bookingRoutes from './routes/bookingRoutes.js';
import confirmPaymentRoutes from './routes/confirmPaymentRoutes.js';
import contactRoutes from './routes/contact.js';
import faqRoutes from './routes/faq.js';
import showtimeRoutes from './routes/showtime.route.js';
import seatRoutes from './routes/seat.route.js';
import parkingRoutes from './routes/parking.route.js';
import seatGeneratorRoutes from './routes/seatGenerator.route.js';
import adminRoutes from './routes/admin.route.js';
import stripeRoutes from './routes/stripe.route.js';

// Models
import Showtime from './models/showtime.model.js';

// Controllers for scheduled tasks
import { archivePastShowtimes, generateNextDayShowtimes, reopenAllShowtimes } from './controllers/showtime.controller.js';
import { releaseExpiredHolds } from './controllers/seat.controller.js';
import { releaseExpiredParkingHolds } from './controllers/parking.controller.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;

// Set up Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://cinemax-beta-ten.vercel.app',
      'https://cinimaxx.vercel.app',
      'https://cinimax.vercel.app',
      'https://www.cinexp.app',
      'https://cinematic-popcorn-theatre-experience.vercel.app',
      'https://cinematic-popcorn-park.vercel.app',
    ],
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Join a room for specific showtime updates
  socket.on('joinShowtime', (showtimeId) => {
    socket.join(`showtime-${showtimeId}`);
    console.log(`User ${socket.id} joined room for showtime ${showtimeId}`);
  });
  
  // Leave a room when no longer needed
  socket.on('leaveShowtime', (showtimeId) => {
    socket.leave(`showtime-${showtimeId}`);
    console.log(`User ${socket.id} left room for showtime ${showtimeId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://cinemax-beta-ten.vercel.app',
  'https://www.cinexp.app',
  'https://cinexp.app',
  'https://cinimax.vercel.app',
  'https://cinimaxx.vercel.app',
  'https://cinematic-popcorn-theatre-experience.vercel.app',
  'https://cinematic-popcorn-park.vercel.app',
];

// Apply CORS FIRST before any other middleware to ensure headers are always sent
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      // Still allow the request but log it - this prevents CORS errors on error responses
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Cache-Control', 'Pragma', 'X-Requested-With'],
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());
app.use(cookieParser());
// CORS Configuration to allow requests from your Netlify frontend

// Connect to MongoDB using Mongoose
mongoose
  .connect(process.env.MONGO)
  .then(() => console.log('Connected to MongoDB with Mongoose'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api', bookingRoutes);
app.use('/api', confirmPaymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/seat-generator', seatGeneratorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check endpoint for Render cold start prevention
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Cinematic Popcorn Park backend is alive!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Schedule jobs
// Release expired holds and check for past showtimes every minute
cron.schedule('* * * * *', async () => {
  try {
    // Import models here to avoid circular dependencies
    const Seat = mongoose.model('Seat');
    const ParkingSlot = mongoose.model('ParkingSlot');
    
    console.log(`Running minute scheduler at ${new Date().toISOString()}`);
    
    // First, archive past showtimes to ensure accurate booking status
    const archivedCount = await archivePastShowtimes();
    if (archivedCount > 0) {
      console.log(`Archived ${archivedCount} past showtimes during minute scheduler`);
      io.emit('showtimesUpdated', { message: 'Some showtimes have been archived' });
    }
    
    // Then release expired seat holds
    const releasedSeats = await releaseExpiredHolds();
    
    // Emit socket events for each affected showtime
    for (const [showtimeId, seatIds] of Object.entries(releasedSeats.seatsByShowtime || {})) {
      const updatedSeats = await Seat.find({ _id: { $in: seatIds } });
      io.to(`showtime-${showtimeId}`).emit('seatsUpdated', {
        seats: updatedSeats,
        showtimeId
      });
    }
    
    // Release expired parking holds
    const releasedParking = await releaseExpiredParkingHolds();
    
    // Emit socket events for each affected showtime
    for (const [showtimeId, slotIds] of Object.entries(releasedParking.slotsByShowtime || {})) {
      const updatedSlots = await ParkingSlot.find({ _id: { $in: slotIds } });
      io.to(`showtime-${showtimeId}`).emit('parkingUpdated', {
        parkingSlots: updatedSlots,
        showtimeId
      });
    }
  } catch (error) {
    console.error('Error in scheduled release of expired holds and showtime archiving:', error);
  }
});

// Archive past showtimes every minute to ensure timely updates
cron.schedule('* * * * *', async () => {
  try {
    console.log(`Running archiving cron job at ${new Date().toISOString()}`);
    const archivedCount = await archivePastShowtimes();
    
    if (archivedCount > 0) {
      console.log(`Cron job archived ${archivedCount} showtimes`);
      // Notify clients about archived showtimes if any were updated
      io.emit('showtimesUpdated', { 
        message: 'Some showtimes have been archived',
        count: archivedCount,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in cron job archiving past showtimes:', error);
  }
});

// Generate next day showtimes daily at midnight and reopen all archived showtimes
cron.schedule('0 0 * * *', async () => {
  try {
    console.log(`Running daily showtime management at ${new Date().toISOString()}`);
    
    // Step 1: Reopen all archived showtimes for the new day
    console.log('Step 1: Reopening all archived showtimes...');
    const reopenedCount = await reopenAllShowtimes();
    console.log(`Daily cron job reopened ${reopenedCount} archived showtimes`);
    
    // Step 2: Check if we have enough showtimes for today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check today's showtimes
    const todayShowtimes = await Showtime.find({
      date: {
        $gte: today,
        $lt: tomorrow
      },
      isArchived: false
    });
    
    // Check tomorrow's showtimes
    const tomorrowShowtimes = await Showtime.find({
      date: {
        $gte: tomorrow,
        $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      },
      isArchived: false
    });
    
    console.log(`Found ${todayShowtimes.length} unarchived showtimes for today`);
    console.log(`Found ${tomorrowShowtimes.length} unarchived showtimes for tomorrow`);
    
    // Step 3: Generate new showtimes for tomorrow if needed
    let generatedCount = 0;
    if (tomorrowShowtimes.length === 0) {
      console.log('Step 3: Generating new showtimes for tomorrow...');
      generatedCount = await generateNextDayShowtimes();
      console.log(`Generated ${generatedCount} new showtimes for tomorrow`);
    } else {
      console.log('Step 3: Tomorrow already has showtimes, skipping generation');
    }
    
    // Step 4: Notify clients about the changes
    if (generatedCount > 0 || reopenedCount > 0) {
      console.log(`Daily cron job completed successfully:`);
      console.log(`- Reopened: ${reopenedCount} archived showtimes`);
      console.log(`- Generated: ${generatedCount} new showtimes`);
      console.log(`- Today's available showtimes: ${todayShowtimes.length + reopenedCount}`);
      console.log(`- Tomorrow's available showtimes: ${tomorrowShowtimes.length + generatedCount}`);
      
      // Notify all connected clients about the updates
      io.emit('showtimesUpdated', { 
        message: 'Daily showtime management completed - showtimes have been refreshed',
        reopenedCount: reopenedCount,
        generatedCount: generatedCount,
        todayCount: todayShowtimes.length + reopenedCount,
        tomorrowCount: tomorrowShowtimes.length + generatedCount,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('Daily cron job completed - no changes needed');
    }
    
  } catch (error) {
    console.error('Error in daily showtime management:', error);
    // Try to notify about the error
    try {
      io.emit('showtimesUpdated', {
        message: 'Error in daily showtime management',
        error: true,
        timestamp: new Date().toISOString()
      });
    } catch (notifyError) {
      console.error('Failed to notify clients about error:', notifyError);
    }
  }
});

// Check for missing showtimes every 6 hours and generate if needed
cron.schedule('0 */6 * * *', async () => {
  try {
    console.log(`Running 6-hourly showtime check at ${new Date().toISOString()}`);
    
    // Check if we have showtimes for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const Showtime = mongoose.model('Showtime');
    const tomorrowShowtimes = await Showtime.find({
      date: {
        $gte: tomorrow,
        $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      },
      isArchived: false
    });
    
    if (tomorrowShowtimes.length === 0) {
      console.log('No showtimes found for tomorrow during 6-hourly check. Generating...');
      const generatedCount = await generateNextDayShowtimes();
      console.log(`6-hourly check generated ${generatedCount} new showtimes`);
      
      if (generatedCount > 0) {
        io.emit('showtimesUpdated', { 
          message: 'Missing showtimes have been generated',
          count: generatedCount,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log(`6-hourly check found ${tomorrowShowtimes.length} showtimes for tomorrow. No generation needed.`);
    }
  } catch (error) {
    console.error('Error in 6-hourly showtime check:', error);
  }
});

// Backup check every 30 minutes to ensure showtimes are available
cron.schedule('*/30 * * * *', async () => {
  try {
    console.log('Running 30-minute backup check for showtime availability...');
    
    const currentDate = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if we have any active, unarchived showtimes for today
    const todayActiveShowtimes = await Showtime.find({
      date: {
        $gte: today,
        $lt: tomorrow
      },
      isArchived: false,
      startTime: { $gt: currentDate } // Only future showtimes
    });
    
    // Check if we have movies but no available showtimes
    const Movie = (await import('./models/movie.model.js')).default;
    const activeMovies = await Movie.find({ isActive: true });
    
    console.log(`Backup check: Found ${activeMovies.length} active movies and ${todayActiveShowtimes.length} available showtimes for today`);
    
    // If we have movies but no available showtimes, try to reopen archived ones
    if (activeMovies.length > 0 && todayActiveShowtimes.length === 0) {
      console.log('No available showtimes found for active movies. Attempting emergency reopening...');
      
      const reopenedCount = await reopenAllShowtimes();
      
      if (reopenedCount > 0) {
        console.log(`Emergency backup: Reopened ${reopenedCount} archived showtimes`);
        
        // Notify clients about the emergency reopening
        io.emit('showtimesUpdated', {
          message: 'Emergency reopening: Showtimes have been made available',
          reopenedCount: reopenedCount,
          emergencyReopen: true,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('No archived showtimes available for reopening. This may require admin attention.');
      }
    }
    
    // Also check for tomorrow's showtimes
    const tomorrowShowtimes = await Showtime.find({
      date: {
        $gte: tomorrow,
        $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      },
      isArchived: false
    });
    
    if (activeMovies.length > 0 && tomorrowShowtimes.length === 0) {
      console.log('No showtimes found for tomorrow. Generating new ones...');
      const generatedCount = await generateNextDayShowtimes();
      
      if (generatedCount > 0) {
        console.log(`Backup check generated ${generatedCount} showtimes for tomorrow`);
      }
    }
    
  } catch (error) {
    console.error('Error in 30-minute backup check:', error);
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('CSP is set!');
});

// Error handler with CORS headers
app.use((err, req, res, next) => {
  // Ensure CORS headers are set even on error responses
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
});

// Start the server with Socket.IO support
httpServer.listen(PORT, () => {
  console.log(`Server running at:${PORT} with Socket.IO support`);
});
