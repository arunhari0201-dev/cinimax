import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign,
  faCar,
  faMotorcycle,
  faSpinner,
  faExclamationCircle,
  faCheckCircle,
  faCouch,
  faChair,
  faFilm,
  faClock,
  faUsers,
  faLock,
  faLockOpen
} from '@fortawesome/free-solid-svg-icons';
import {
  connectSocket,
  joinShowtimeRoom,
  leaveShowtimeRoom,
  useSocket,
  holdSeat,
  releaseSeat,
  holdParkingSlot,
  releaseParkingSlot
} from '../services/socketService';

// Import the shared movie image utility
import { getMovieImage } from '../utils/movieImages';

const Tickets = () => {
  const { movieId, showtimeId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);

  // Reference for selected seats to use in effects
  const selectedSeatsRef = useRef([]);
  const selectedParkingRef = useRef({ twoWheeler: [], fourWheeler: [] });

  // State for data fetching
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showtimeData, setShowtimeData] = useState(null);
  const [movieData, setMovieData] = useState(null);
  const [seats, setSeats] = useState([]);
  const [parkingSlots, setParkingSlots] = useState({
    twoWheeler: [],
    fourWheeler: []
  });

  // State for user selections
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [parkingNeeded, setParkingNeeded] = useState(false);
  const [selectedTwoWheelerSlots, setSelectedTwoWheelerSlots] = useState([]);
  const [selectedFourWheelerSlots, setSelectedFourWheelerSlots] = useState([]);
  const [phone, setPhone] = useState("");
  const [vehicleNumbers, setVehicleNumbers] = useState({ twoWheeler: [], fourWheeler: [] });

  // Constants - Different prices for different categories
  const SEAT_PRICE = {
    STANDARD: 150,  // Updated to match database price
    Standard: 150,
    Gold: 150,
    Silver: 150,
    PREMIUM: 180,
    Premium: 180,
    Platinum: 180,
    VIP: 250,
    Diamond: 250,
    Balcony: 250
  };
  const TWO_WHEELER_PRICE = 50;
  const FOUR_WHEELER_PRICE = 100;

  // Calculate parking cost
  const parkingCost = selectedTwoWheelerSlots.length * TWO_WHEELER_PRICE +
    selectedFourWheelerSlots.length * FOUR_WHEELER_PRICE;

  // API base URL
  const backendUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://cinimax.onrender.com'
      : 'http://localhost:5000';

  // Setup socket connection with event handlers
  const { socket, isConnected } = useSocket([
    {
      event: 'seatsUpdated',
      handler: ({ seats: updatedSeats }) => {
        if (!Array.isArray(updatedSeats)) {
          console.error("Received non-array seats update from socket:", updatedSeats);
          return;
        }

        setSeats(prevSeats => {
          if (!Array.isArray(prevSeats) || prevSeats.length === 0) return updatedSeats;

          return prevSeats.map(seat => {
            const updatedSeat = updatedSeats.find(us => us._id === seat._id);
            return updatedSeat ? updatedSeat : seat;
          });
        });
      }
    },
    {
      event: 'parkingUpdated',
      handler: ({ parkingSlots: updatedSlots }) => {
        setParkingSlots(prev => {
          const twoWheelers = prev.twoWheeler.map(slot => {
            const updated = updatedSlots.find(us => us._id === slot._id && us.type === 'twoWheeler');
            return updated ? updated : slot;
          });

          const fourWheelers = prev.fourWheeler.map(slot => {
            const updated = updatedSlots.find(us => us._id === slot._id && us.type === 'fourWheeler');
            return updated ? updated : slot;
          });

          return {
            twoWheeler: twoWheelers,
            fourWheeler: fourWheelers
          };
        });
      }
    },
    {
      event: 'holdExpired',
      handler: ({ type, itemId }) => {
        // Handle expired holds
        if (type === 'seat') {
          setSelectedSeats(prev => prev.filter(seat => seat._id !== itemId));
        } else if (type === 'twoWheeler') {
          setSelectedTwoWheelerSlots(prev => prev.filter(slot => slot._id !== itemId));
        } else if (type === 'fourWheeler') {
          setSelectedFourWheelerSlots(prev => prev.filter(slot => slot._id !== itemId));
        }

        // Show notification
        Swal.fire({
          title: 'Hold Expired',
          text: `Your hold on a ${type === 'seat' ? 'seat' : 'parking slot'} has expired.`,
          icon: 'warning',
          timer: 3000,
          timerProgressBar: true
        });
      }
    }
  ]);

  // Calculate total cost based on selected seats and parking
  useEffect(() => {
    // Calculate seat cost with different prices for different categories
    const seatCost = Array.isArray(selectedSeats) ? selectedSeats.reduce((acc, seat) => {
      const price = SEAT_PRICE[seat.category] || SEAT_PRICE.STANDARD;
      return acc + price;
    }, 0) : 0;

    // Add parking cost
    setTotalCost(seatCost + parkingCost);

    // Update refs for use in cleanup
    selectedSeatsRef.current = selectedSeats;
    selectedParkingRef.current = {
      twoWheeler: selectedTwoWheelerSlots,
      fourWheeler: selectedFourWheelerSlots
    };
  }, [selectedSeats, selectedTwoWheelerSlots, selectedFourWheelerSlots, parkingCost]);

  // Initial data loading
  useEffect(() => {
    // Check if user is logged in
    if (!currentUser) {
      console.error('User not authenticated');
      Swal.fire({
        title: 'Authentication Required',
        text: 'You need to be logged in to book tickets. Please sign in and try again.',
        icon: 'warning',
        confirmButtonText: 'Sign In'
      }).then(() => {
        navigate('/sign-in');
      });
      return;
    }

    // Check for valid params
    if (!movieId || !showtimeId || movieId === 'undefined' || showtimeId === 'undefined') {
      console.error('Invalid movieId or showtimeId', { movieId, showtimeId });
      setError('Invalid movie or showtime information. Please go back and try again.');
      setLoading(false);

      // Show error modal with redirect option
      Swal.fire({
        title: 'Error',
        text: 'There was a problem loading the booking information. Would you like to return to the homepage?',
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'Return to Homepage',
        cancelButtonText: 'Stay Here'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/');
        }
      });
      return;
    }

    // Fetch data
    fetchData();

    // Cleanup function
    return () => {
      // Release all held seats and parking slots
      selectedSeatsRef.current.forEach(seat => {
        releaseSeat(showtimeId, seat._id);
      });

      selectedParkingRef.current.twoWheeler.forEach(slot => {
        releaseParkingSlot(showtimeId, slot._id);
      });

      selectedParkingRef.current.fourWheeler.forEach(slot => {
        releaseParkingSlot(showtimeId, slot._id);
      });

      // Leave the showtime room
      leaveShowtimeRoom(showtimeId);
    };
  }, [movieId, showtimeId, currentUser]);

  // Join showtime room when data is loaded
  useEffect(() => {
    if (showtimeData?._id) {
      joinShowtimeRoom(showtimeData._id);
    }
  }, [showtimeData]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Double-check IDs before making requests
      if (!movieId || movieId === 'undefined' || !showtimeId || showtimeId === 'undefined') {
        throw new Error('Invalid movie or showtime ID');
      }

      // Fetch showtime data
      const showtimeRes = await axios.get(`${backendUrl}/api/showtimes/${showtimeId}`, {
        withCredentials: true
      });
      setShowtimeData(showtimeRes.data);

      // Fetch movie data
      const movieRes = await axios.get(`${backendUrl}/api/movies/${movieId}`, {
        withCredentials: true
      });
      setMovieData(movieRes.data);

      // Fetch seats for this showtime with aggressive cache busting
      const timestamp = Date.now();
      const randomParam = Math.random().toString(36).substring(7);
      const seatsRes = await axios.get(`${backendUrl}/api/seats/showtime/${showtimeId}?_t=${timestamp}&_r=${randomParam}&nocache=true`, {
        withCredentials: true
      });
      console.log('🎯 Fresh seats fetched from API:', seatsRes.data);
      console.log('🔢 Number of seats:', seatsRes.data.length);
      console.log('📊 Sample seat data:', seatsRes.data.slice(0, 3));
      setSeats(seatsRes.data);

      // Fetch parking slots for this showtime
      const parkingRes = await axios.get(`${backendUrl}/api/parking/showtime/${showtimeId}`, {
        withCredentials: true
      });
      setParkingSlots({
        twoWheeler: parkingRes.data.twoWheelerSlots || [],
        fourWheeler: parkingRes.data.fourWheelerSlots || []
      });

    } catch (err) {
      console.error('Error fetching data:', err);

      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        Swal.fire({
          title: 'Session Expired',
          text: 'Your session has expired. Please sign in again to continue booking.',
          icon: 'warning',
          confirmButtonText: 'Sign In'
        }).then(() => {
          navigate('/sign-in');
        });
        return;
      }

      // Determine the specific error message
      let errorMessage = 'An error occurred while fetching data.';
      if (err.message === 'Invalid movie or showtime ID') {
        errorMessage = 'Invalid booking information. Please return to the homepage and try again.';
      } else if (err.response?.status === 404) {
        // Handle 404 errors specifically
        if (err.config?.url?.includes('/api/movies/')) {
          errorMessage = 'The selected movie could not be found. It may have been removed from our system.';
        } else if (err.config?.url?.includes('/api/showtimes/')) {
          errorMessage = 'The selected showtime is no longer available. Please choose another showtime.';
        }
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }

      setError(errorMessage);

      // Add a button to return to homepage
      Swal.fire({
        title: 'Booking Error',
        text: errorMessage + ' Would you like to return to the homepage?',
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'Return to Homepage',
        cancelButtonText: 'Stay Here'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/');
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle seat selection
  const handleSeatSelection = (seat) => {
    // Can't select unavailable seats
    if (seat.status !== 'AVAILABLE') return;

    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s._id === seat._id);

      if (isSelected) {
        // Release the seat
        releaseSeat(showtimeId, seat._id);
        return prev.filter(s => s._id !== seat._id);
      } else {
        // Hold the seat
        holdSeat(showtimeId, seat._id);
        return [...prev, seat];
      }
    });
  };

  // Handle parking slot selection
  const handleParkingSelection = (slot, type) => {
    // Can't select unavailable parking slots
    if (slot.status !== 'AVAILABLE') return;

    if (type === 'twoWheeler') {
      setSelectedTwoWheelerSlots(prev => {
        const isSelected = prev.some(s => s._id === slot._id);

        if (isSelected) {
          // Release the slot
          releaseParkingSlot(showtimeId, slot._id);
          return prev.filter(s => s._id !== slot._id);
        } else {
          // Hold the slot
          holdParkingSlot(showtimeId, slot._id);
          return [...prev, slot];
        }
      });
    } else if (type === 'fourWheeler') {
      setSelectedFourWheelerSlots(prev => {
        const isSelected = prev.some(s => s._id === slot._id);

        if (isSelected) {
          // Release the slot
          releaseParkingSlot(showtimeId, slot._id);
          return prev.filter(s => s._id !== slot._id);
        } else {
          // Hold the slot
          holdParkingSlot(showtimeId, slot._id);
          return [...prev, slot];
        }
      });
    }
  };

  // Handle vehicle number input
  const handleVehicleNumberChange = (type, index, value) => {
    setVehicleNumbers(prev => {
      const newNumbers = [...prev[type]];
      newNumbers[index] = value;
      return { ...prev, [type]: newNumbers };
    });
  };

  // Proceed to payment
  const handleProceedToPayment = () => {
    if (selectedSeats.length === 0) {
      Swal.fire({
        title: 'No Seats Selected',
        text: 'Please select at least one seat to continue.',
        icon: 'warning',
        confirmButtonColor: '#C8A951'
      });
      return;
    }

    // Check if any seats or parking is selected - require phone verification for both
    const hasSeatsSelected = selectedSeats.length > 0;
    const hasParkingSelected = selectedTwoWheelerSlots.length > 0 || selectedFourWheelerSlots.length > 0;

    if (hasSeatsSelected || hasParkingSelected) {
      // Phone number is required for any booking
      if (!phone || phone.trim() === '') {
        Swal.fire({
          title: 'Phone Number Required',
          text: 'Phone number is required for booking. Please enter your phone number.',
          icon: 'warning',
          confirmButtonColor: '#C8A951'
        });
        return;
      }

      // Basic phone number validation
      const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(phone.trim())) {
        Swal.fire({
          title: 'Invalid Phone Number',
          text: 'Please enter a valid phone number (10-15 digits).',
          icon: 'error',
          confirmButtonColor: '#C8A951'
        });
        return;
      }
    }

    // Validate vehicle numbers for selected parking slots
    if (selectedTwoWheelerSlots.length > 0) {
      for (let i = 0; i < selectedTwoWheelerSlots.length; i++) {
        const vehicleNumber = vehicleNumbers.twoWheeler[i];
        if (!vehicleNumber || vehicleNumber.trim() === '') {
          Swal.fire({
            title: 'Vehicle Number Required',
            text: `Please enter vehicle number for Two Wheeler Slot ${selectedTwoWheelerSlots[i].slotNumber}.`,
            icon: 'warning',
            confirmButtonColor: '#C8A951'
          });
          return;
        }
        // Basic vehicle number validation (can be customized for Indian format)
        const vehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/i;
        if (!vehicleRegex.test(vehicleNumber.replace(/\s/g, ''))) {
          Swal.fire({
            title: 'Invalid Vehicle Number',
            text: `Please enter a valid vehicle number for Two Wheeler Slot ${selectedTwoWheelerSlots[i].slotNumber} (e.g., TN01AB1234).`,
            icon: 'error',
            confirmButtonColor: '#C8A951'
          });
          return;
        }
      }
    }

    if (selectedFourWheelerSlots.length > 0) {
      for (let i = 0; i < selectedFourWheelerSlots.length; i++) {
        const vehicleNumber = vehicleNumbers.fourWheeler[i];
        if (!vehicleNumber || vehicleNumber.trim() === '') {
          Swal.fire({
            title: 'Vehicle Number Required',
            text: `Please enter vehicle number for Four Wheeler Slot ${selectedFourWheelerSlots[i].slotNumber}.`,
            icon: 'warning',
            confirmButtonColor: '#C8A951'
          });
          return;
        }
        // Basic vehicle number validation (can be customized for Indian format)
        const vehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/i;
        if (!vehicleRegex.test(vehicleNumber.replace(/\s/g, ''))) {
          Swal.fire({
            title: 'Invalid Vehicle Number',
            text: `Please enter a valid vehicle number for Four Wheeler Slot ${selectedFourWheelerSlots[i].slotNumber} (e.g., TN01AB1234).`,
            icon: 'error',
            confirmButtonColor: '#C8A951'
          });
          return;
        }
      }
    }

    // Create booking data
    const bookingData = {
      showtimeId,
      movieId,
      seats: selectedSeats.map(seat => seat._id),
      parkingSlots: [
        ...selectedTwoWheelerSlots.map(slot => ({
          slotId: slot._id,
          vehicleNumber: vehicleNumbers.twoWheeler[selectedTwoWheelerSlots.indexOf(slot)] || ''
        })),
        ...selectedFourWheelerSlots.map(slot => ({
          slotId: slot._id,
          vehicleNumber: vehicleNumbers.fourWheeler[selectedFourWheelerSlots.indexOf(slot)] || ''
        }))
      ],
      phone,
      totalCost
    };

    // Navigate to payment method selection page with booking data
    navigate('/payment-method', {
      state: {
        bookingData,
        movieDetails: movieData,
        showtimeDetails: showtimeData,
        selectedSeats,
        selectedParking: {
          twoWheeler: selectedTwoWheelerSlots,
          fourWheeler: selectedFourWheelerSlots
        }
      }
    });
  };

  // Toggle parking needed
  const handleToggleParkingNeeded = () => {
    setParkingNeeded(!parkingNeeded);

    // Clear parking selections if turning off parking
    if (parkingNeeded) {
      // Release all selected parking slots
      selectedTwoWheelerSlots.forEach(slot => {
        releaseParkingSlot(showtimeId, slot._id);
      });

      selectedFourWheelerSlots.forEach(slot => {
        releaseParkingSlot(showtimeId, slot._id);
      });

      setSelectedTwoWheelerSlots([]);
      setSelectedFourWheelerSlots([]);
      setVehicleNumbers({ twoWheeler: [], fourWheeler: [] });
    }
  };

  // Helper function to render individual seats
  const renderSeat = (seat) => {
    // Determine seat status class
    let seatClass = '';

    // Override with status colors
    if (Array.isArray(selectedSeats) && selectedSeats.some(s => s._id === seat._id)) {
      // Selected: Bright Orange matching the new design template
      seatClass = 'bg-[#ff7a00] text-white border border-[#e06b00] shadow-[0_0_12px_rgba(255,122,0,0.4)] scale-105 font-black';
    } else if (seat.status === 'HELD' || seat.status === 'SOLD') {
      // Sold/Held: Dark Slate Blue matching the background style of unavailable seats
      seatClass = 'bg-[#252839] text-[#4d5375]/60 border border-[#343950] cursor-not-allowed';
    } else {
      // Available: Soft Slate/Purple-Grey
      seatClass = 'bg-[#787d9a] hover:bg-[#8e94b7] text-[#181b27] border border-[#636885]/30 hover:scale-105';
    }

    return (
      <div
        key={seat._id}
        onClick={() => handleSeatSelection(seat)}
        className={`${seatClass} w-8 h-8 flex items-center justify-center 
                  text-[10px] font-bold rounded-t-[8px] rounded-b-[2px] cursor-pointer transition-all duration-200
                  hover:shadow-lg relative`}
        title={`${seat.seatNumber} - ${seat.category} (₹${SEAT_PRICE[seat.category] || SEAT_PRICE.STANDARD})`}
      >
        {seat.parsedNumber}
      </div>
    );
  };

  // Group seats by row for display
  const seatsByRow = Array.isArray(seats) && seats.length > 0 ? seats.reduce((acc, seat) => {
    // Parse row from seatNumber (e.g., "A1" -> row "A", number "1")
    const seatNumber = seat.seatNumber || '';
    const rowMatch = seatNumber.match(/^([A-Z]+)/);
    const row = rowMatch ? rowMatch[1] : 'Unknown';

    if (!acc[row]) acc[row] = [];
    acc[row].push({
      ...seat,
      parsedRow: row,
      parsedNumber: seatNumber.replace(/^[A-Z]+/, '') || '0'
    });
    return acc;
  }, {}) : {};

  // Debug seat grouping
  console.log('Total seats:', seats.length);
  console.log('Row keys:', Object.keys(seatsByRow));

  // Debug seat categories (can be removed in production)
  if (seats.length > 0) {
    const uniqueCategories = [...new Set(seats.map(seat => seat.category))];
    console.log('Unique seat categories found:', uniqueCategories);

    // Show detailed breakdown by category
    const categoryBreakdown = {};
    seats.forEach(seat => {
      const category = seat.category || 'undefined';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = [];
      }
      categoryBreakdown[category].push(seat.seatNumber);
    });

    console.log('Category breakdown:', categoryBreakdown);
    console.log('Current showtime ID:', showtimeId);
    console.log('Sample seats from each row:');
    ['A', 'F', 'K'].forEach(row => {
      const rowSeats = seats.filter(seat => seat.seatNumber?.startsWith(row));
      if (rowSeats.length > 0) {
        console.log(`Row ${row} sample:`, rowSeats.slice(0, 2).map(s => ({
          seatNumber: s.seatNumber,
          category: s.category,
          price: s.price
        })));
      }
    });
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-[#C8A951] mb-4" />
          <p className="text-[#F5F5F5] text-xl">Loading ticket information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="text-center p-8 max-w-md bg-[#1A1A1A] rounded-lg shadow-lg border border-[#C8A951]/20">
          <FontAwesomeIcon icon={faExclamationCircle} size="3x" className="text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-[#F5F5F5] mb-2">Error Loading Tickets</h2>
          <p className="text-[#F5F5F5]/80 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-[#C8A951] hover:bg-[#DFBD69] text-[#0D0D0D] font-semibold rounded-md transition-all duration-300"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] py-10">
      <div className="container mx-auto px-4">
        {/* Movie and showtime info */}
        {movieData && showtimeData && (
          <div className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg mb-8 border border-[#C8A951]/20">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-full md:w-1/4">
                <img
                  src={getMovieImage(movieData)}
                  alt={movieData.name}
                  className="w-full h-auto rounded-lg shadow-md"
                  onError={(e) => {
                    console.log('Image failed to load:', e.target.src);
                    // Try to use the default new.jpg image from local images
                    const defaultImage = '/src/images/new.jpg';
                    if (e.target.src !== defaultImage) {
                      e.target.src = defaultImage;
                    } else {
                      // If default image also fails, use a generic fallback
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzMzMzMzMyIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
                    }
                  }}
                />
              </div>

              <div className="w-full md:w-3/4">
                <h1 className="text-3xl font-bold text-[#F5F5F5] mb-2">{movieData.name}</h1>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-[#C8A951] text-[#0D0D0D] font-semibold text-sm rounded-full">
                    {movieData.genre}
                  </span>
                  <span className="px-3 py-1 bg-[#1A1A1A] border border-[#C8A951]/30 text-[#F5F5F5] text-sm rounded-full">
                    {movieData.duration} min
                  </span>
                  <span className="px-3 py-1 bg-[#1A1A1A] border border-[#C8A951]/30 text-[#F5F5F5] text-sm rounded-full">
                    {movieData.rating}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="flex items-center text-[#F5F5F5] mb-2">
                      <FontAwesomeIcon icon={faFilm} className="w-5 h-5 mr-2 text-[#C8A951]" />
                      <span className="font-medium">Screen:</span>
                      <span className="ml-2">{showtimeData.screen || 'Loading...'}</span>
                    </div>

                    <div className="flex items-center text-[#F5F5F5] mb-2">
                      <FontAwesomeIcon icon={faClock} className="w-5 h-5 mr-2 text-[#C8A951]" />
                      <span className="font-medium">Date:</span>
                      <span className="ml-2">
                        {showtimeData.startTime ? new Date(showtimeData.startTime).toLocaleDateString() : 'Loading...'}
                      </span>
                    </div>

                    <div className="flex items-center text-[#F5F5F5]">
                      <FontAwesomeIcon icon={faClock} className="w-5 h-5 mr-2 text-[#C8A951]" />
                      <span className="font-medium">Time:</span>
                      <span className="ml-2">
                        {showtimeData.startTime ? new Date(showtimeData.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Loading...'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center text-[#F5F5F5] mb-2">
                      <FontAwesomeIcon icon={faUsers} className="w-5 h-5 mr-2 text-[#C8A951]" />
                      <span className="font-medium">Available Seats:</span>
                      <span className="ml-2">
                        {Array.isArray(seats) ?
                          `${seats.filter(seat => seat.status === 'AVAILABLE').length} / ${seats.length}` :
                          'Loading...'}
                      </span>
                    </div>

                    <div className="flex items-center text-[#F5F5F5]">
                      <FontAwesomeIcon icon={faDollarSign} className="w-5 h-5 mr-2 text-[#C8A951]" />
                      <span className="font-medium">Current Selection:</span>
                      <span className="ml-2">₹{totalCost}</span>
                    </div>
                  </div>
                </div>

                {/* Socket connection status */}
                <div className="flex items-center mt-4">
                  <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-[#F5F5F5]">
                    {isConnected ? 'Real-time updates active' : 'Connecting to real-time server...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seat selection */}
        <div className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg mb-8 border border-[#C8A951]/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-[#F5F5F5]">
              Select Your Seats
            </h2>

            <button
              onClick={() => {
                console.log('🔄 Force refreshing seat data with cache bypass...');

                // Clear any potential cache
                if (typeof localStorage !== 'undefined') {
                  localStorage.removeItem(`seats_${showtimeId}`);
                }
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorage.removeItem(`seats_${showtimeId}`);
                }

                // Reset state first
                setSeats([]);
                setLoading(true);

                // Force refresh with timestamp
                fetchData();
              }}
              className="px-4 py-2 bg-[#C8A951] hover:bg-[#DFBD69] text-[#0D0D0D] font-semibold rounded-md transition-all duration-300 text-sm"
            >
              🔄 Force Refresh Seats
            </button>
          </div>

          <div className="w-full flex justify-center mb-8 overflow-x-auto">
            <div className="w-full min-w-[700px] max-w-4xl p-10 bg-[#181b27] rounded-3xl border border-neutral-900 shadow-2xl">

              {/* Thin Curved Line Screen at the top */}
              <div className="w-full flex justify-center mb-16 relative">
                <div className="w-[70%] max-w-xl h-[4px] relative">
                  <svg viewBox="0 0 100 10" className="w-full overflow-visible">
                    <path d="M 0,8 Q 50,0 100,8" fill="none" stroke="#787d9a" strokeWidth="1.5" opacity="0.45" />
                  </svg>
                </div>
              </div>

              {/* Seats arrangement in 4 quadrants (vertical central aisle + horizontal aisle after row 4) */}
              <div className="space-y-3">
                {(() => {
                  const sortedRowKeys = Object.keys(seatsByRow).sort().reverse();
                  return sortedRowKeys.map((row, rowIndex) => {
                    const rowSeats = seatsByRow[row];
                    const sortedSeats = [...rowSeats].sort((a, b) => parseInt(a.parsedNumber) - parseInt(b.parsedNumber));

                    // Row Number (1-indexed from top to bottom)
                    const rowNumber = rowIndex + 1;

                    // Split the row in half for the vertical center aisle
                    const halfIndex = Math.ceil(sortedSeats.length / 2);
                    const leftHalf = sortedSeats.slice(0, halfIndex);
                    const rightHalf = sortedSeats.slice(halfIndex);

                    return (
                      <React.Fragment key={row}>
                        <div className="flex justify-center items-center">
                          {/* Left Half Seats */}
                          <div className="flex gap-2">
                            {leftHalf.map(seat => renderSeat(seat))}
                          </div>

                          {/* Vertical Center Aisle */}
                          <div className="w-12 flex-shrink-0"></div>

                          {/* Right Half Seats */}
                          <div className="flex gap-2">
                            {rightHalf.map(seat => renderSeat(seat))}
                          </div>

                          {/* Row Number Label on the Right */}
                          <div className="w-10 flex items-center justify-center text-gray-500 font-bold text-sm ml-4">
                            {rowNumber}
                          </div>
                        </div>

                        {/* Horizontal Aisle gap after Row 4 */}
                        {rowNumber === 4 && (
                          <div className="h-10 w-full" />
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
              </div>

              {/* Legend matching the design layout */}
              <div className="w-full border-t border-neutral-900 my-8"></div>

              <div className="flex justify-center space-x-8 flex-wrap gap-y-4">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-[#787d9a] border border-[#636885]/30 rounded-t-[6px] rounded-b-[2px]"></div>
                  <span className="text-[#787d9a] text-xs font-semibold ml-2">Available</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-[#ff7a00] border border-[#e06b00] rounded-t-[6px] rounded-b-[2px]"></div>
                  <span className="text-[#ff7a00] text-xs font-semibold ml-2">Selected</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-[#252839] border border-[#343950] rounded-t-[6px] rounded-b-[2px]"></div>
                  <span className="text-[#4d5375] text-xs font-semibold ml-2">Sold / Held</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Parking section */}
        <div className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg mb-8 border border-[#C8A951]/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[#F5F5F5]">
              Valet Parking
            </h2>

            <button
              onClick={handleToggleParkingNeeded}
              className={`px-4 py-2 rounded-md flex items-center transition
                ${parkingNeeded
                  ? 'bg-[#C8A951] hover:bg-[#DFBD69] text-[#0D0D0D] font-semibold'
                  : 'bg-[#3A3A3A] hover:bg-[#4A4A4A] text-[#F5F5F5]'}`}
            >
              <FontAwesomeIcon
                icon={parkingNeeded ? faLock : faLockOpen}
                className="mr-2"
              />
              {parkingNeeded ? 'Parking Selected' : 'Add Parking'}
            </button>
          </div>

          {parkingNeeded && (
            <div className="space-y-6">
              {/* Two Wheeler Parking */}
              <div>
                <h3 className="text-xl font-medium text-[#F5F5F5] mb-4 flex items-center">
                  <FontAwesomeIcon icon={faMotorcycle} className="mr-2 text-[#C8A951]" />
                  Two Wheeler Parking (₹{TWO_WHEELER_PRICE}/slot)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {parkingSlots.twoWheeler.map(slot => {
                    // Determine slot status class
                    let slotClass = 'bg-[#3A3A3A] hover:bg-[#4A4A4A]'; // available

                    if (selectedTwoWheelerSlots.some(s => s._id === slot._id)) {
                      slotClass = 'bg-[#C8A951] hover:bg-[#DFBD69]'; // selected by current user
                    } else if (slot.status === 'HELD') {
                      slotClass = 'bg-yellow-500 cursor-not-allowed'; // held by someone
                    } else if (slot.status === 'SOLD') {
                      slotClass = 'bg-red-500 cursor-not-allowed'; // sold
                    }

                    return (
                      <div
                        key={slot._id}
                        onClick={() => handleParkingSelection(slot, 'twoWheeler')}
                        className={`${slotClass} p-3 flex items-center justify-center 
                                  text-[#F5F5F5] rounded-md cursor-pointer transition-all`}
                      >
                        <div className="text-center">
                          <FontAwesomeIcon icon={faMotorcycle} className="mb-1" />
                          <div className="text-sm">{slot.slotNumber}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vehicle number inputs */}
                {selectedTwoWheelerSlots.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[#C8A951] text-sm mb-3 flex items-center">
                      <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
                      Vehicle numbers are required for all selected parking slots (e.g., TN01AB1234)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTwoWheelerSlots.map((slot, index) => (
                        <div key={slot._id} className="flex items-center">
                          <span className="text-[#F5F5F5] mr-2 whitespace-nowrap">
                            {slot.slotNumber}:
                          </span>
                          <input
                            type="text"
                            placeholder="Vehicle Number *"
                            value={vehicleNumbers.twoWheeler[index] || ''}
                            onChange={(e) => handleVehicleNumberChange('twoWheeler', index, e.target.value)}
                            className="bg-[#1A1A1A] border-2 border-[#C8A951] text-[#F5F5F5] px-3 py-1 rounded-md w-full focus:border-[#DFBD69] focus:ring-2 focus:ring-[#C8A951]/20 focus:outline-none transition-all duration-300"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Four Wheeler Parking */}
              <div>
                <h3 className="text-xl font-medium text-[#F5F5F5] mb-4 flex items-center">
                  <FontAwesomeIcon icon={faCar} className="mr-2 text-[#C8A951]" />
                  Four Wheeler Parking (₹{FOUR_WHEELER_PRICE}/slot)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {parkingSlots.fourWheeler.map(slot => {
                    // Determine slot status class
                    let slotClass = 'bg-[#3A3A3A] hover:bg-[#4A4A4A]'; // available

                    if (selectedFourWheelerSlots.some(s => s._id === slot._id)) {
                      slotClass = 'bg-[#C8A951] hover:bg-[#DFBD69]'; // selected by current user
                    } else if (slot.status === 'HELD') {
                      slotClass = 'bg-yellow-500 cursor-not-allowed'; // held by someone
                    } else if (slot.status === 'SOLD') {
                      slotClass = 'bg-red-500 cursor-not-allowed'; // sold
                    }

                    return (
                      <div
                        key={slot._id}
                        onClick={() => handleParkingSelection(slot, 'fourWheeler')}
                        className={`${slotClass} p-4 flex items-center justify-center 
                                  text-[#F5F5F5] rounded-md cursor-pointer transition-all`}
                      >
                        <div className="text-center">
                          <FontAwesomeIcon icon={faCar} className="mb-1" />
                          <div className="text-sm">{slot.slotNumber}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vehicle number inputs */}
                {selectedFourWheelerSlots.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[#C8A951] text-sm mb-3 flex items-center">
                      <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
                      Vehicle numbers are required for all selected parking slots (e.g., TN01AB1234)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedFourWheelerSlots.map((slot, index) => (
                        <div key={slot._id} className="flex items-center">
                          <span className="text-[#F5F5F5] mr-2 whitespace-nowrap">
                            {slot.slotNumber}:
                          </span>
                          <input
                            type="text"
                            placeholder="Vehicle Number *"
                            value={vehicleNumbers.fourWheeler[index] || ''}
                            onChange={(e) => handleVehicleNumberChange('fourWheeler', index, e.target.value)}
                            className="bg-[#1A1A1A] border-2 border-[#C8A951] text-[#F5F5F5] px-3 py-1 rounded-md w-full focus:border-[#DFBD69] focus:ring-2 focus:ring-[#C8A951]/20 focus:outline-none transition-all duration-300"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contact information */}
        <div className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg mb-8 border border-[#C8A951]/20">
          <h2 className="text-2xl font-semibold text-[#F5F5F5] mb-4">
            Contact Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className={`block mb-1 ${(selectedSeats.length > 0 || selectedTwoWheelerSlots.length > 0 || selectedFourWheelerSlots.length > 0)
                    ? 'text-[#C8A951] font-semibold'
                    : 'text-[#F5F5F5]'
                  }`}>
                  Phone Number {(selectedSeats.length > 0 || selectedTwoWheelerSlots.length > 0 || selectedFourWheelerSlots.length > 0) && (
                    <span className="text-red-400">*</span>
                  )}
                  {(selectedSeats.length > 0 || selectedTwoWheelerSlots.length > 0 || selectedFourWheelerSlots.length > 0) && (
                    <span className="text-sm text-yellow-400 block">Required for booking verification</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`flex-1 px-4 py-2 rounded-md transition-all duration-300 ${(selectedSeats.length > 0 || selectedTwoWheelerSlots.length > 0 || selectedFourWheelerSlots.length > 0)
                        ? 'bg-[#1A1A1A] border-2 border-[#C8A951] text-[#F5F5F5] focus:border-[#DFBD69] focus:ring-2 focus:ring-[#C8A951]/20'
                        : 'bg-[#1A1A1A] border border-gray-600 text-[#F5F5F5] focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]/20'
                      } focus:outline-none`}
                    required={selectedSeats.length > 0 || selectedTwoWheelerSlots.length > 0 || selectedFourWheelerSlots.length > 0}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary and checkout */}
        <div className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg border border-[#C8A951]/20">
          <h2 className="text-2xl font-semibold text-[#F5F5F5] mb-4">
            Booking Summary
          </h2>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-[#F5F5F5]/80">Selected Seats:</span>
              <span className="text-[#F5F5F5] font-medium">
                {!Array.isArray(selectedSeats) || selectedSeats.length === 0 ? 'None' :
                  selectedSeats.map(seat => {
                    console.log('Seat object:', seat); // Debug log
                    return seat.seatNumber || 'Unknown';
                  }).join(', ')}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#F5F5F5]/80">Seats Cost:</span>
              <span className="text-[#F5F5F5] font-medium">
                ₹{Array.isArray(selectedSeats) ? selectedSeats.reduce((acc, seat) => {
                  const price = SEAT_PRICE[seat.category] || SEAT_PRICE.STANDARD;
                  return acc + price;
                }, 0) : 0}
              </span>
            </div>

            {/* Show individual seat breakdown if seats are selected */}
            {Array.isArray(selectedSeats) && selectedSeats.length > 0 && (
              <div className="text-xs text-[#F5F5F5]/60 mt-1 mb-2">
                {selectedSeats.map(seat => {
                  const price = SEAT_PRICE[seat.category] || SEAT_PRICE.STANDARD;
                  return (
                    <div key={seat._id} className="flex justify-between">
                      <span>{seat.seatNumber} ({seat.category}):</span>
                      <span>₹{price}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {parkingNeeded && (
              <>
                <div className="flex justify-between">
                  <span className="text-[#F5F5F5]/80">Two Wheeler Parking:</span>
                  <span className="text-[#F5F5F5] font-medium">
                    {selectedTwoWheelerSlots.length} × ₹{TWO_WHEELER_PRICE} = ₹{selectedTwoWheelerSlots.length * TWO_WHEELER_PRICE}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#F5F5F5]/80">Four Wheeler Parking:</span>
                  <span className="text-[#F5F5F5] font-medium">
                    {selectedFourWheelerSlots.length} × ₹{FOUR_WHEELER_PRICE} = ₹{selectedFourWheelerSlots.length * FOUR_WHEELER_PRICE}
                  </span>
                </div>
              </>
            )}

            <div className="border-t border-[#C8A951]/30 pt-2 mt-2">
              <div className="flex justify-between text-lg">
                <span className="text-[#C8A951] font-semibold">Total Cost:</span>
                <span className="text-[#C8A951] font-bold text-xl">₹{totalCost}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleProceedToPayment}
              disabled={
                !Array.isArray(selectedSeats) ||
                selectedSeats.length === 0
              }
              className="px-6 py-3 bg-[#C8A951] hover:bg-[#DFBD69] text-[#0D0D0D] font-semibold rounded-md transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#3A3A3A] disabled:text-[#F5F5F5]/50"
            >
              <FontAwesomeIcon icon={faDollarSign} className="mr-2" />
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tickets;
