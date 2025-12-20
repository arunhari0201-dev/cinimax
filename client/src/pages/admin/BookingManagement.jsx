import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// Import the shared movie image utility
import { getMovieImage } from '../../utils/movieImages';
import {
  FaTicketAlt,
  FaSearch,
  FaFilter,
  FaEye,
  FaEdit,
  FaBan,
  FaCheck,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaCalendar,
  FaUser,
  FaFilm,
  FaChair,
  FaCar,
  FaDollarSign
} from 'react-icons/fa';

export default function BookingManagement() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    paymentStatus: 'all',
    movieId: 'all',
    date: ''
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [movies, setMovies] = useState([]);

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  useEffect(() => {
    if (!currentUser || !['admin', 'manager', 'staff'].includes(currentUser.role)) {
      navigate('/');
      return;
    }
    fetchBookings();
    fetchMovies();
  }, [currentUser, navigate, currentPage, filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...filters
      });

      const response = await axios.get(`${backendUrl}/api/admin/bookings?${params}`, {
        withCredentials: true
      });

      setBookings(response.data.bookings);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error.response?.data?.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovies = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/movies`, {
        withCredentials: true
      });
      setMovies(response.data);
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const updateBookingStatus = async (bookingId, action, newStatus = null) => {
    try {
      const payload = action === 'cancel' ? { action } : { paymentStatus: newStatus };
      
      await axios.put(`${backendUrl}/api/admin/bookings/${bookingId}`, 
        payload,
        { withCredentials: true }
      );
      
      fetchBookings();
      setShowBookingModal(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(error.response?.data?.message || 'Failed to update booking');
    }
  };

  const viewBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-black';
      case 'cancelled':
        return 'bg-red-500 text-white';
      case 'failed':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-6xl text-[#C8A951] animate-spin mb-4" />
          <p className="text-[#F5F5F5] text-lg">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#C8A951] mb-2 flex items-center">
              <FaTicketAlt className="mr-3" />
              Booking Management
            </h1>
            <p className="text-[#F5F5F5]/70">Manage all movie bookings</p>
          </div>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="bg-[#C8A951] text-[#0D0D0D] px-4 py-2 rounded hover:bg-[#DFBD69] transition duration-300"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#C8A951] mb-1">
                <FaFilter className="inline mr-1" />
                Payment Status
              </label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#C8A951] mb-1">
                <FaFilm className="inline mr-1" />
                Movie
              </label>
              <select
                value={filters.movieId}
                onChange={(e) => handleFilterChange('movieId', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              >
                <option value="all">All Movies</option>
                {movies.map((movie) => (
                  <option key={movie._id} value={movie._id}>
                    {movie.title || movie.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#C8A951] mb-1">
                <FaCalendar className="inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ paymentStatus: 'all', movieId: 'all', date: '' });
                  setCurrentPage(1);
                }}
                className="w-full bg-[#E50914] text-[#F5F5F5] px-4 py-2 rounded hover:bg-[#E50914]/80 transition duration-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0D0D0D] border-b border-[#C8A951]/30">
                <tr>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Booking ID</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">User</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Movie</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Show Time</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Seats</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Parking</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Amount</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Status</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Date</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-[#F5F5F5]/10 hover:bg-[#0D0D0D]/50">
                    <td className="py-4 px-6 text-[#F5F5F5] font-mono text-sm">
                      {booking._id.slice(-8)}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-[#F5F5F5] font-medium">
                          {booking.userId?.username}
                        </div>
                        <div className="text-[#F5F5F5]/70 text-sm">
                          {booking.userId?.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <img
                          src={getMovieImage(booking.movieId)}
                          alt={booking.movieId?.name}
                          className="w-12 h-16 object-cover object-center rounded mr-3 flex-shrink-0"
                          loading="lazy"
                          onError={(e) => {
                            console.log('Booking management image failed to load for:', booking.movieId);
                            const defaultImage = '/src/images/new.jpg';
                            if (e.target.src !== defaultImage) {
                              e.target.src = defaultImage;
                            }
                          }}
                        />
                        <div>
                          <div className="text-[#F5F5F5] font-medium">
                            {booking.movieId?.name}
                          </div>
                          <div className="text-[#F5F5F5]/70 text-sm">
                            {booking.movieId?.genre}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#F5F5F5]">
                      {booking.showtimeId ? (
                        <div>
                          <div>{booking.showtimeId.screen}</div>
                          <div className="text-sm text-[#F5F5F5]/70">
                            {new Date(booking.showtimeId.startTime).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-4 px-6 text-[#F5F5F5]">
                      <div className="flex items-center">
                        <FaChair className="mr-1 text-[#C8A951]" />
                        {booking.seats?.length || 0}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#F5F5F5]">
                      <div className="flex items-center">
                        <FaCar className="mr-1 text-[#C8A951]" />
                        {booking.parkingSlots?.length || 0}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#F5F5F5] font-semibold">
                      <div className="flex items-center">
                        <FaDollarSign className="mr-1 text-[#C8A951]" />
                        {booking.totalCost}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.paymentStatus)}`}>
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#F5F5F5]">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewBookingDetails(booking)}
                          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition duration-300"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        {['admin', 'manager'].includes(currentUser.role) && booking.paymentStatus !== 'cancelled' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to cancel this booking?')) {
                                updateBookingStatus(booking._id, 'cancel');
                              }
                            }}
                            className="bg-[#E50914] text-white p-2 rounded hover:bg-[#E50914]/80 transition duration-300"
                            title="Cancel Booking"
                          >
                            <FaBan />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-[#F5F5F5]/70">
            Showing {bookings.length} bookings
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-[#C8A951] text-[#0D0D0D] px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#DFBD69] transition duration-300"
            >
              <FaChevronLeft />
            </button>
            <span className="flex items-center px-4 py-2 text-[#F5F5F5]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-[#C8A951] text-[#0D0D0D] px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#DFBD69] transition duration-300"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Booking Details Modal */}
        {showBookingModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#C8A951]">Booking Details</h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-[#F5F5F5] hover:text-[#E50914] text-xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Information */}
                <div>
                  <h3 className="text-xl font-semibold text-[#C8A951] mb-4">Booking Information</h3>
                  <div className="space-y-3 bg-[#0D0D0D] p-4 rounded">
                    <div>
                      <span className="text-[#F5F5F5]/70">Booking ID:</span>
                      <span className="text-[#F5F5F5] ml-2 font-mono">{selectedBooking._id}</span>
                    </div>
                    <div>
                      <span className="text-[#F5F5F5]/70">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedBooking.paymentStatus)}`}>
                        {selectedBooking.paymentStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#F5F5F5]/70">Total Amount:</span>
                      <span className="text-[#C8A951] ml-2 font-semibold">${selectedBooking.totalCost}</span>
                    </div>
                    <div>
                      <span className="text-[#F5F5F5]/70">Booking Date:</span>
                      <span className="text-[#F5F5F5] ml-2">
                        {new Date(selectedBooking.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#F5F5F5]/70">Phone:</span>
                      <span className="text-[#F5F5F5] ml-2">
                        {selectedBooking.phone || selectedBooking.userId?.phone || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* User Information */}
                  <h3 className="text-xl font-semibold text-[#C8A951] mb-4 mt-6">User Information</h3>
                  <div className="space-y-3 bg-[#0D0D0D] p-4 rounded">
                    <div className="flex items-center">
                      <img
                        src={selectedBooking.userId?.profilePicture}
                        alt={selectedBooking.userId?.username}
                        className="w-12 h-12 rounded-full mr-3"
                      />
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">
                          {selectedBooking.userId?.username}
                        </div>
                        <div className="text-[#F5F5F5]/70">
                          {selectedBooking.userId?.email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Movie & Show Information */}
                <div>
                  <h3 className="text-xl font-semibold text-[#C8A951] mb-4">Movie & Show Details</h3>
                  <div className="space-y-4">
                    {/* Movie Info */}
                    <div className="bg-[#0D0D0D] p-4 rounded">
                      <div className="flex items-center mb-3">
                        <img
                          src={getMovieImage(selectedBooking.movieId)}
                          alt={selectedBooking.movieId?.name}
                          className="w-16 h-20 object-cover rounded mr-3"
                          onError={(e) => {
                            console.log('Booking modal image failed to load for:', selectedBooking.movieId);
                            const defaultImage = '/src/images/new.jpg';
                            if (e.target.src !== defaultImage) {
                              e.target.src = defaultImage;
                            }
                          }}
                        />
                        <div>
                          <div className="text-[#F5F5F5] font-semibold text-lg">
                            {selectedBooking.movieId?.name}
                          </div>
                          <div className="text-[#F5F5F5]/70">
                            {selectedBooking.movieId?.genre} • {selectedBooking.movieId?.duration} min
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Showtime Info */}
                    {selectedBooking.showtimeId && (
                      <div className="bg-[#0D0D0D] p-4 rounded">
                        <h4 className="text-[#C8A951] font-semibold mb-2">Showtime</h4>
                        <div>
                          <span className="text-[#F5F5F5]/70">Screen:</span>
                          <span className="text-[#F5F5F5] ml-2">{selectedBooking.showtimeId.screen}</span>
                        </div>
                        <div>
                          <span className="text-[#F5F5F5]/70">Date & Time:</span>
                          <span className="text-[#F5F5F5] ml-2">
                            {new Date(selectedBooking.showtimeId.startTime).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Seats */}
                    {selectedBooking.seats && selectedBooking.seats.length > 0 && (
                      <div className="bg-[#0D0D0D] p-4 rounded">
                        <h4 className="text-[#C8A951] font-semibold mb-2">
                          <FaChair className="inline mr-2" />
                          Seats ({selectedBooking.seats.length})
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                          {selectedBooking.seats.map((seat, index) => (
                            <div key={index} className="bg-[#C8A951] text-[#0D0D0D] p-2 rounded text-center text-sm font-semibold">
                              {seat.seatNumber}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parking */}
                    {selectedBooking.parkingSlots && selectedBooking.parkingSlots.length > 0 && (
                      <div className="bg-[#0D0D0D] p-4 rounded">
                        <h4 className="text-[#C8A951] font-semibold mb-2">
                          <FaCar className="inline mr-2" />
                          Parking ({selectedBooking.parkingSlots.length})
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedBooking.parkingSlots.map((slot, index) => (
                            <div key={index} className="bg-[#E50914] text-[#F5F5F5] p-2 rounded text-center text-sm font-semibold">
                              {slot.slotNumber}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Actions */}
                  {['admin', 'manager'].includes(currentUser.role) && selectedBooking.paymentStatus !== 'cancelled' && (
                    <div className="mt-6">
                      <h4 className="text-[#C8A951] font-semibold mb-3">Admin Actions</h4>
                      <div className="flex space-x-3">
                        {selectedBooking.paymentStatus === 'pending' && (
                          <button
                            onClick={() => updateBookingStatus(selectedBooking._id, 'status', 'confirmed')}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition duration-300 flex items-center"
                          >
                            <FaCheck className="mr-2" />
                            Confirm Payment
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this booking? This will release the seats and parking slots.')) {
                              updateBookingStatus(selectedBooking._id, 'cancel');
                            }
                          }}
                          className="bg-[#E50914] text-white px-4 py-2 rounded hover:bg-[#E50914]/80 transition duration-300 flex items-center"
                        >
                          <FaBan className="mr-2" />
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
