import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';

// Socket instance (singleton)
let socket;

/**
 * Initialize the Socket.IO connection
 * @returns {Object} The socket instance
 */
export const initSocket = () => {
  if (!socket) {
    // Use correct backend URL based on environment
    const backendUrl = 
      process.env.NODE_ENV === 'production' 
        ? 'https://cinematic-popcorn-theatre-experience-3.onrender.com' 
        : 'http://localhost:5000';
    
    socket = io(backendUrl, {
      withCredentials: true,
      autoConnect: false,
      transports: ['polling', 'websocket'], // Start with polling (more reliable for cold starts)
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,      // Wait 3 seconds before first retry
      reconnectionDelayMax: 30000,  // Max 30 seconds between retries
      timeout: 30000,               // 30 second timeout for cold starts
    });

    // Set up default socket event listeners
    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('connect_error', (error) => {
      // Suppress excessive logging for cold start scenarios
      if (!socket._coldStartLogged) {
        console.warn('Socket connection error (server may be waking up):', error.message);
        socket._coldStartLogged = true;
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Disconnected: ${reason}`);
    });
  }
  
  return socket;
};

/**
 * Connect to the socket server
 * @returns {Object} The connected socket instance
 */
export const connectSocket = () => {
  const socket = initSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

/**
 * Disconnect from the socket server
 */
export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};

/**
 * Custom React hook for using Socket.IO
 * @param {Array} eventHandlers - Array of event handlers [{ event, handler }]
 * @returns {Object} Socket instance and connection status
 */
export const useSocket = (eventHandlers = []) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to socket
    const socket = connectSocket();
    
    // Connection event listeners
    const onConnect = () => {
      setIsConnected(true);
    };
    
    const onDisconnect = () => {
      setIsConnected(false);
    };
    
    // Register connection listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    // Set initial connection status
    setIsConnected(socket.connected);
    
    // Register custom event handlers
    eventHandlers.forEach(({ event, handler }) => {
      socket.on(event, handler);
    });
    
    // Cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      
      // Remove custom event listeners
      eventHandlers.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
    };
  }, []);
  
  return { socket, isConnected };
};

/**
 * Join a room for a specific showtime
 * @param {String} showtimeId - The showtime ID to join
 */
export const joinShowtimeRoom = (showtimeId) => {
  const socket = connectSocket();
  socket.emit('joinShowtime', showtimeId);
  console.log(`Joining showtime room: ${showtimeId}`);
};

/**
 * Leave a room for a specific showtime
 * @param {String} showtimeId - The showtime ID to leave
 */
export const leaveShowtimeRoom = (showtimeId) => {
  if (socket) {
    socket.emit('leaveShowtime', showtimeId);
    console.log(`Leaving showtime room: ${showtimeId}`);
  }
};

/**
 * Hold a seat for a limited time
 * @param {String} showtimeId - The showtime ID 
 * @param {String} seatId - The seat ID to hold
 */
export const holdSeat = (showtimeId, seatId) => {
  const socket = connectSocket();
  socket.emit('holdSeat', { showtimeId, seatId });
};

/**
 * Release a previously held seat
 * @param {String} showtimeId - The showtime ID
 * @param {String} seatId - The seat ID to release
 */
export const releaseSeat = (showtimeId, seatId) => {
  const socket = connectSocket();
  socket.emit('releaseSeat', { showtimeId, seatId });
};

/**
 * Hold a parking slot for a limited time
 * @param {String} showtimeId - The showtime ID
 * @param {String} slotId - The parking slot ID to hold
 */
export const holdParkingSlot = (showtimeId, slotId) => {
  const socket = connectSocket();
  socket.emit('holdParkingSlot', { showtimeId, slotId });
};

/**
 * Release a previously held parking slot
 * @param {String} showtimeId - The showtime ID
 * @param {String} slotId - The parking slot ID to release
 */
export const releaseParkingSlot = (showtimeId, slotId) => {
  const socket = connectSocket();
  socket.emit('releaseParkingSlot', { showtimeId, slotId });
};

/**
 * Get the current socket instance
 * @returns {Object} The socket instance
 */
export const getSocket = () => {
  return socket;
};

export default {
  initSocket,
  connectSocket,
  disconnectSocket,
  useSocket,
  joinShowtimeRoom,
  leaveShowtimeRoom,
  holdSeat,
  releaseSeat,
  holdParkingSlot,
  releaseParkingSlot,
  getSocket,
};
