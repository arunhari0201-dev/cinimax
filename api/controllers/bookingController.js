
import Booking from '../models/booking.js';
import User from '../models/user.model.js';
import Seat, { SeatStatus } from '../models/seat.model.js';
import ParkingSlot, { ParkingStatus } from '../models/parking.model.js';
import Showtime from '../models/showtime.model.js';
import Movie from '../models/movie.model.js';
import mongoose from 'mongoose';

// Create a new booking (atomic checkout)
export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      movieId, 
      showtimeId, 
      userId, 
      seatIds, 
      parkingSlotIds, 
      totalCost, 
      phone,
      paymentIntentId,
      paymentMethod = 'demo'
    } = req.body;
    
    if (!movieId || !showtimeId || !userId || !seatIds || !totalCost) {
      return res.status(400).json({ 
        message: 'Missing required fields for booking' 
      });
    }
    
    // Check if the showtime exists and is bookable
    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found' });
    }
    
    // Check if the showtime is bookable based on cutoff time
    const currentTime = new Date();
    const showtimeStart = new Date(showtime.startTime);
    const cutoffTime = new Date(showtimeStart.getTime() - (showtime.cutoffMinutes * 60000));
    
    if (currentTime > showtimeStart) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Booking not available. Showtime has already started' });
    }
    
    if (currentTime > cutoffTime) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: `Booking not available. Cutoff time (${showtime.cutoffMinutes} minutes before showtime) has passed`
      });
    }
    
    // Verify all seats are valid and held by this user
    let seats = await Seat.find({ 
      _id: { $in: seatIds },
      userId,
      status: SeatStatus.HELD
    }).session(session);
    
    // If seats are not held, try to re-hold them if they're available
    if (seats.length !== seatIds.length) {
      console.log(`Only ${seats.length} of ${seatIds.length} seats are held. Attempting to re-hold available seats.`);
      
      // Find seats that are available (not held by this user)
      const availableSeats = await Seat.find({ 
        _id: { $in: seatIds },
        status: SeatStatus.AVAILABLE
      }).session(session);
      
      if (availableSeats.length > 0) {
        console.log(`Found ${availableSeats.length} available seats. Re-holding them.`);
        
        // Re-hold the available seats
        const holdUntil = new Date(Date.now() + 15 * 60000); // 15 minutes hold
        
        await Seat.updateMany(
          { _id: { $in: availableSeats.map(s => s._id) } },
          { 
            $set: { 
              status: SeatStatus.HELD,
              userId,
              holdUntil
            } 
          },
          { session }
        );
        
        // Re-fetch all seats to verify they're now held
        seats = await Seat.find({ 
          _id: { $in: seatIds },
          userId,
          status: SeatStatus.HELD
        }).session(session);
      }
    }
    
    if (seats.length !== seatIds.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ 
        message: 'Some seats are no longer available. Please select different seats.',
        heldCount: seats.length,
        requestedCount: seatIds.length,
        availableSeats: seatIds.length - seats.length
      });
    }
    
    // Verify all parking slots if provided
    let parkingSlots = [];
    if (parkingSlotIds && parkingSlotIds.length > 0) {
      parkingSlots = await ParkingSlot.find({
        _id: { $in: parkingSlotIds },
        userId,
        status: ParkingStatus.HELD
      }).session(session);
      
      // If parking slots are not held, try to re-hold them if they're available
      if (parkingSlots.length !== parkingSlotIds.length) {
        console.log(`Only ${parkingSlots.length} of ${parkingSlotIds.length} parking slots are held. Attempting to re-hold available slots.`);
        
        // Find parking slots that are available (not held by this user)
        const availableParkingSlots = await ParkingSlot.find({ 
          _id: { $in: parkingSlotIds },
          status: ParkingStatus.AVAILABLE
        }).session(session);
        
        if (availableParkingSlots.length > 0) {
          console.log(`Found ${availableParkingSlots.length} available parking slots. Re-holding them.`);
          
          // Re-hold the available parking slots
          const holdUntil = new Date(Date.now() + 15 * 60000); // 15 minutes hold
          
          await ParkingSlot.updateMany(
            { _id: { $in: availableParkingSlots.map(s => s._id) } },
            { 
              $set: { 
                status: ParkingStatus.HELD,
                userId,
                holdUntil
              } 
            },
            { session }
          );
          
          // Re-fetch all parking slots to verify they're now held
          parkingSlots = await ParkingSlot.find({
            _id: { $in: parkingSlotIds },
            userId,
            status: ParkingStatus.HELD
          }).session(session);
        }
      }
      
      if (parkingSlots.length !== parkingSlotIds.length) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ 
          message: 'Some parking slots are no longer available. Please select different parking slots.',
          heldCount: parkingSlots.length,
          requestedCount: parkingSlotIds.length,
          availableSlots: parkingSlotIds.length - parkingSlots.length
        });
      }
    }
    
    // Create the booking
    const newBooking = new Booking({
      movieId,
      showtimeId,
      userId,
      seats: seatIds,
      parkingSlots: parkingSlotIds,
      totalCost,
      phone: phone || null,
      paymentStatus: 'COMPLETED', // Assuming payment is already completed
      paymentMethod,
      paymentIntentId: paymentIntentId || null
    });
    
    // Save the booking
    const savedBooking = await newBooking.save({ session });
    
    // Update seats to SOLD status
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { 
        $set: { 
          status: SeatStatus.SOLD,
          holdUntil: null
        } 
      },
      { session }
    );
    
    // Update parking slots to SOLD status if any
    if (parkingSlotIds && parkingSlotIds.length > 0) {
      await ParkingSlot.updateMany(
        { _id: { $in: parkingSlotIds } },
        { 
          $set: { 
            status: ParkingStatus.SOLD,
            holdUntil: null
          } 
        },
        { session }
      );
    }
    
    await session.commitTransaction();
    session.endSession();

    // Clean up Redis locks since booking is completed successfully
    const redisClient = req.app.get('redis');
    if (redisClient) {
      for (const seatId of seatIds) {
        await redisClient.del(`lock:showtime:${showtimeId}:seat:${seatId}`);
      }
    }
    
    // Populate the booking with related data for response
    const populatedBooking = await Booking.findById(savedBooking._id)
      .populate('movieId', 'name imageUrl')
      .populate('userId', 'username email')
      .populate('seats')
      .populate('parkingSlots');
    
    // Emit socket events for real-time updates
    req.app.get('io').to(`showtime-${showtimeId}`).emit('seatsUpdated', {
      seats: await Seat.find({ _id: { $in: seatIds } }),
      showtimeId
    });
    
    if (parkingSlotIds && parkingSlotIds.length > 0) {
      req.app.get('io').to(`showtime-${showtimeId}`).emit('parkingUpdated', {
        parkingSlots: await ParkingSlot.find({ _id: { $in: parkingSlotIds } }),
        showtimeId
      });
    }
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
};

// Get all bookings for admin
export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('movieId', 'name imageUrl')
      .populate('userId', 'username email')
      .populate('seats')
      .populate('parkingSlots')
      .sort({ createdAt: -1 });
    
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};

// Get booking details by ID
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('movieId', 'name imageUrl')
      .populate('userId', 'username email')
      .populate('seats')
      .populate('parkingSlots')
      .populate({
        path: 'showtimeId',
        model: 'Showtime'
      });
      
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ message: 'Error fetching booking details', error: error.message });
  }
};

// Get bookings for a specific user
export const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure users can only access their own bookings
    if (req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied. You can only view your own bookings.' });
    }
    
    const bookings = await Booking.find({ userId })
      .populate('movieId', 'name imageUrl')
      .populate('userId', 'username email')
      .populate('seats')
      .populate('parkingSlots')
      .populate({
        path: 'showtimeId',
        model: 'Showtime'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Error fetching user bookings', error: error.message });
  }
};
