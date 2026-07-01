import mongoose from 'mongoose';
import Seat, { SeatStatus } from '../models/seat.model.js';
import ParkingSlot, { ParkingStatus } from '../models/parking.model.js';
import Showtime from '../models/showtime.model.js';

// Map database categories to frontend categories
const mapCategory = (dbCategory) => {
  // If the category is already in the standard format, return as-is
  if (['STANDARD', 'PREMIUM', 'VIP'].includes(dbCategory)) {
    return dbCategory;
  }
  
  // Legacy mapping for older category names
  const categoryMap = {
    'Silver': 'STANDARD',
    'Gold': 'PREMIUM', 
    'Platinum': 'VIP',
    'Diamond': 'VIP',
    'Balcony': 'STANDARD'
  };
  return categoryMap[dbCategory] || 'STANDARD';
};

// Get available seats for a specific showtime
export const getSeatsByShowtime = async (req, res) => {
  try {
    const { showtimeId } = req.params;
    
    // Check for valid ObjectId to prevent casting errors
    if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
      return res.status(400).json({ message: 'Invalid showtime ID format' });
    }
    
    // Check if the showtime exists
    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found' });
    }
    
    // Check if the showtime is bookable based on cutoff time
    const currentTime = new Date();
    const showtimeStart = new Date(showtime.startTime);
    const cutoffTime = new Date(showtimeStart.getTime() - (showtime.cutoffMinutes * 60000));
    
    if (currentTime > showtimeStart) {
      return res.status(400).json({ 
        message: 'Booking not available. Showtime has already started',
        isBookable: false
      });
    }
    
    if (currentTime > cutoffTime) {
      return res.status(400).json({ 
        message: `Booking not available. Cutoff time (${showtime.cutoffMinutes} minutes before showtime) has passed`,
        isBookable: false
      });
    }
    
    // Get all seats for this showtime
    const seats = await Seat.find({ showtimeId })
      .sort({ seatNumber: 1 });
    
    // Transform seats data to match frontend expectations
    const transformedSeats = seats.map(seat => ({
      ...seat.toObject(),
      number: seat.seatNumber, // Map seatNumber to number for frontend
      category: mapCategory(seat.category) // Map category names
    }));
    
    res.status(200).json(transformedSeats);
  } catch (error) {
    console.error('Error fetching seats:', error);
    res.status(500).json({ message: 'Failed to fetch seats', error: error.message });
  }
};

// Hold seats temporarily for a user
export const holdSeats = async (req, res) => {
  try {
    const { showtimeId, seatIds, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ message: 'Seat IDs array is required' });
    }
    
    // Check if the showtime exists
    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found' });
    }
    
// Check if the showtime is bookable based on various conditions
    const currentTime = new Date();
    const showtimeStart = new Date(showtime.startTime);
    const showtimeEnd = new Date(showtime.endTime);
    const cutoffTime = new Date(showtimeStart.getTime() - (showtime.cutoffMinutes * 60000));
    
    // Check if showtime is archived
    if (showtime.isArchived) {
      return res.status(400).json({ message: 'Booking not available. This showtime has been archived' });
    }
    
    // Check if showtime has already ended
    if (currentTime > showtimeEnd) {
      return res.status(400).json({ message: 'Booking not available. This showtime has already ended' });
    }
    
    // Check if showtime has already started
    if (currentTime > showtimeStart) {
      return res.status(400).json({ message: 'Booking not available. Showtime has already started' });
    }
    
    // Check if cutoff time has passed
    if (currentTime > cutoffTime) {
      return res.status(400).json({ 
        message: `Booking not available. Cutoff time (${showtime.cutoffMinutes} minutes before showtime) has passed` 
      });
    }    // Set expiration time (15 minutes from now)
    const holdUntil = new Date(Date.now() + 15 * 60000); // 15 minutes
    
    // Acquire Redis locks
    const redisClient = req.app.get('redis');
    const lockDurationSec = 900; // 15 minutes
    
    if (redisClient) {
      const multi = redisClient.multi();
      for (const seatId of seatIds) {
        const lockKey = `lock:showtime:${showtimeId}:seat:${seatId}`;
        multi.set(lockKey, userId, { NX: true, EX: lockDurationSec });
      }
      const results = await multi.exec();
      const hasFailed = results.some(res => res !== 'OK');
      if (hasFailed) {
        // Revert locks that were successfully acquired in this batch
        for (let i = 0; i < results.length; i++) {
          if (results[i] === 'OK') {
            await redisClient.del(`lock:showtime:${showtimeId}:seat:${seatIds[i]}`);
          }
        }
        return res.status(409).json({ message: 'Some seats are already locked. Please select different seats.' });
      }
    }

    // Update all seats to HELD status if they are available
    const result = await Seat.updateMany(
      { 
        _id: { $in: seatIds }, 
        status: SeatStatus.AVAILABLE 
      },
      { 
        $set: { 
          status: SeatStatus.HELD,
          holdUntil,
          userId
        } 
      }
    );
    
    if (result.modifiedCount < seatIds.length) {
      // Some seats were not available, revert the ones we did hold
      await Seat.updateMany(
        { 
          _id: { $in: seatIds }, 
          status: SeatStatus.HELD,
          userId
        },
        { 
          $set: { 
            status: SeatStatus.AVAILABLE,
            holdUntil: null,
            userId: null
          } 
        }
      );
      
      // Clean up any acquired Redis locks
      if (redisClient) {
        for (const seatId of seatIds) {
          await redisClient.del(`lock:showtime:${showtimeId}:seat:${seatId}`);
        }
      }
      
      return res.status(409).json({ 
        message: 'Some seats are no longer available. Please refresh and try again.',
        modifiedCount: result.modifiedCount,
        requestedCount: seatIds.length
      });
    }
    
    // Get the updated seats
    const updatedSeats = await Seat.find({ _id: { $in: seatIds } });
    
    // Emit socket event for real-time updates
    req.app.get('io').to(`showtime-${showtimeId}`).emit('seatsUpdated', {
      seats: updatedSeats,
      showtimeId
    });
    
    res.status(200).json({
      message: 'Seats held successfully',
      seats: updatedSeats,
      holdUntil
    });
  } catch (error) {
    console.error('Error holding seats:', error);
    res.status(500).json({ message: 'Failed to hold seats', error: error.message });
  }
};

// Release held seats
export const releaseHeldSeats = async (req, res) => {
  try {
    const { seatIds, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ message: 'Seat IDs array is required' });
    }
    
    // Get the showtime ID for socket emission
    const seat = await Seat.findById(seatIds[0]);
    const showtimeId = seat ? seat.showtimeId : null;
    
    // Release only the seats that are held by this user
    const result = await Seat.updateMany(
      { 
        _id: { $in: seatIds }, 
        status: SeatStatus.HELD,
        userId
      },
      { 
        $set: { 
          status: SeatStatus.AVAILABLE,
          holdUntil: null,
          userId: null
        } 
      }
    );
    
    // Clean up Redis locks
    const redisClient = req.app.get('redis');
    if (redisClient && showtimeId) {
      for (const seatId of seatIds) {
        await redisClient.del(`lock:showtime:${showtimeId}:seat:${seatId}`);
      }
    }
    
    // Get the updated seats
    const updatedSeats = await Seat.find({ _id: { $in: seatIds } });
    
    // Emit socket event for real-time updates
    if (showtimeId) {
      req.app.get('io').to(`showtime-${showtimeId}`).emit('seatsUpdated', {
        seats: updatedSeats,
        showtimeId
      });
    }
    
    res.status(200).json({
      message: 'Seats released successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error releasing seats:', error);
    res.status(500).json({ message: 'Failed to release seats', error: error.message });
  }
};

// Automatically release expired seat holds
export const releaseExpiredHolds = async () => {
  try {
    const currentTime = new Date();
    
    // Find seats with expired holds
    const expiredSeats = await Seat.find({
      status: SeatStatus.HELD,
      holdUntil: { $lt: currentTime }
    });
    
    // Group seats by showtime for socket notifications
    const seatsByShowtime = expiredSeats.reduce((acc, seat) => {
      const showtimeId = seat.showtimeId.toString();
      if (!acc[showtimeId]) {
        acc[showtimeId] = [];
      }
      acc[showtimeId].push(seat._id);
      return acc;
    }, {});
    
    // Release all expired holds
    const result = await Seat.updateMany(
      {
        status: SeatStatus.HELD,
        holdUntil: { $lt: currentTime }
      },
      {
        $set: {
          status: SeatStatus.AVAILABLE,
          holdUntil: null,
          userId: null
        }
      }
    );
    
    // For each showtime, emit a socket event with the updated seats
    for (const [showtimeId, seatIds] of Object.entries(seatsByShowtime)) {
      const updatedSeats = await Seat.find({ _id: { $in: seatIds } });
      
      // This is handled in the scheduler that calls this function
      // io.to(`showtime-${showtimeId}`).emit('seatsUpdated', {
      //   seats: updatedSeats,
      //   showtimeId
      // });
    }
    
    console.log(`Released ${result.modifiedCount} expired seat holds`);
    return {
      releasedCount: result.modifiedCount,
      seatsByShowtime
    };
  } catch (error) {
    console.error('Error releasing expired seat holds:', error);
    throw error;
  }
};
