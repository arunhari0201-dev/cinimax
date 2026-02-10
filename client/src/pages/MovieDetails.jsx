import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { 
  FaFilm, 
  FaClock, 
  FaCalendarAlt, 
  FaTv, 
  FaLanguage, 
  FaUsers, 
  FaStar,
  FaArrowLeft,
  FaSpinner
} from 'react-icons/fa';
import { getMovieImage } from '../utils/movieImages';

const MovieDetails = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  
  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  useEffect(() => {
    if (movieId) {
      fetchMovieDetails();
      fetchShowtimes();
    }
  }, [movieId]);

  const fetchMovieDetails = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/movies/${movieId}`);
      setMovie(response.data);
    } catch (error) {
      console.error('Error fetching movie details:', error);
      setError('Failed to load movie details');
    }
  };

  const fetchShowtimes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/showtimes/by-movie/${movieId}`);
      
      console.log('=== FETCH SHOWTIMES DEBUG ===');
      console.log('Current movieId:', movieId);
      console.log('Raw API response:', response.data);
      
      const currentDate = new Date();
      const startOfToday = new Date(currentDate);
      startOfToday.setHours(0, 0, 0, 0);
      
      // Filter to only include future showtimes (no past shows)
      const currentTime = new Date();
      const futureShowtimes = response.data.filter(showtime => {
        const showtimeStart = new Date(showtime.startTime);
        const isNotPast = showtimeStart > currentTime; // Only future showtimes
        const isNotArchived = !showtime.isArchived;
        
        console.log('Filtering showtime:', {
          id: showtime._id,
          startTime: showtime.startTime,
          showtimeStart,
          currentTime,
          isNotPast,
          isNotArchived
        });
        
        return isNotPast && isNotArchived;
      });
      
      console.log('Future showtimes (today and beyond):', futureShowtimes);
      
      // Sort by date, then by start time
      const activeShowtimes = futureShowtimes.sort((a, b) => {
        const dateA = new Date(a.startTime);
        const dateB = new Date(b.startTime);
        return dateA - dateB;
      });
      
      console.log('Processed showtimes:', activeShowtimes);
      console.log('=== END FETCH DEBUG ===');
      setShowtimes(activeShowtimes);
      
      // Set default selected date to today if available, otherwise first available date
      const todayDate = getTodayDate();
      const hasToday = activeShowtimes.some(showtime => normalizeDate(showtime.date) === todayDate);
      
      if (hasToday) {
        setSelectedDate(todayDate);
      } else if (activeShowtimes.length > 0) {
        const firstDate = normalizeDate(activeShowtimes[0].date);
        setSelectedDate(firstDate);
      }
    } catch (error) {
      console.error('Error fetching showtimes:', error);
      setError('Failed to load showtimes');
    } finally {
      setLoading(false);
    }
  };

  // Get today's date in local timezone
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to normalize date for comparison
  const normalizeDate = (dateValue) => {
    if (!dateValue) return null;
    
    try {
      // Convert to Date object first
      let dateObj;
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else if (typeof dateValue === 'string') {
        dateObj = new Date(dateValue);
      } else {
        return null;
      }
      
      // Ensure it's a valid date
      if (isNaN(dateObj.getTime())) {
        return null;
      }
      
      // Use UTC to avoid timezone issues, but get the local date components
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error normalizing date:', dateValue, error);
      return null;
    }
  };

  // Get the actual showtime date from startTime (more reliable than date field)
  const getShowtimeDate = (showtime) => {
    // Use startTime as it's more reliable for the actual showtime date
    return normalizeDate(showtime.startTime);
  };

  // Get today's showtimes (only future ones within today)
  const getTodayShowtimes = () => {
    const currentTime = new Date();
    const today = getTodayDate();
    
    console.log('=== TODAY SHOWTIMES DEBUG ===');
    console.log('Today calculated:', today);
    console.log('Current time:', currentTime);
    console.log('Total showtimes for this movie:', showtimes.length);
    
    const todayShowtimes = showtimes.filter(showtime => {
      const showtimeDate = getShowtimeDate(showtime); // Use startTime instead of date field
      const showtimeStart = new Date(showtime.startTime);
      const isToday = showtimeDate === today;
      const isNotPast = showtimeStart > currentTime; // Only future showtimes
      const isNotArchived = !showtime.isArchived;
      
      console.log('Checking showtime:', {
        id: showtime._id,
        movieId: showtime.movieId,
        originalDate: showtime.date,
        startTime: showtime.startTime,
        showtimeDate,
        today,
        isToday,
        isNotPast,
        isNotArchived,
        screen: showtime.screen
      });
      
      return isToday && isNotPast && isNotArchived;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    console.log('Today showtimes filtered result:', todayShowtimes.length);
    console.log('=== END TODAY DEBUG ===');
    return todayShowtimes;
  };

  // Function to check if a showtime is bookable
  const isShowtimeBookable = (showtime) => {
    // Use the backend's bookingAvailable property if available
    if (showtime.hasOwnProperty('bookingAvailable')) {
      return showtime.bookingAvailable;
    }
    
    // Fallback to frontend calculation
    const currentTime = new Date();
    const showtimeStart = new Date(showtime.startTime);
    const showtimeEnd = new Date(showtime.endTime);
    const cutoffMinutes = showtime.cutoffMinutes || 15;
    const cutoffTime = new Date(showtimeStart.getTime() - (cutoffMinutes * 60000));
    
    return !showtime.isArchived && 
           currentTime < cutoffTime && 
           currentTime < showtimeStart && 
           currentTime < showtimeEnd;
  };

  // Get unique dates from showtimes
  const getAvailableDates = () => {
    const dates = [...new Set(showtimes.map(showtime => {
      const normalizedDate = normalizeDate(showtime.date);
      return normalizedDate;
    }).filter(date => date !== null))];
    return dates.sort();
  };

  // Filter showtimes by selected date
  const getShowtimesForDate = (date) => {
    return showtimes.filter(showtime => {
      const showtimeDate = normalizeDate(showtime.date);
      return showtimeDate === date;
    });
  };

  // Group showtimes by screen
  const groupShowtimesByScreen = (showtimesForDate) => {
    const grouped = {};
    showtimesForDate.forEach(showtime => {
      if (!grouped[showtime.screen]) {
        grouped[showtime.screen] = [];
      }
      grouped[showtime.screen].push(showtime);
    });
    return grouped;
  };

  // Format time display
  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-6xl text-[#C8A951] animate-spin mb-4" />
          <p className="text-[var(--text-primary)] text-lg">Loading movie details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Error</h2>
          <p className="text-[#475467] mb-4">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-[#C8A951] text-[#0D0D0D] px-6 py-2 rounded-lg hover:bg-[#DFBD69] transition duration-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Movie Not Found</h2>
          <button 
            onClick={() => navigate('/')}
            className="bg-[#C8A951] text-[#0D0D0D] px-6 py-2 rounded-lg hover:bg-[#DFBD69] transition duration-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const availableDates = getAvailableDates();
  const showtimesForSelectedDate = getShowtimesForDate(selectedDate);
  const groupedShowtimes = groupShowtimesByScreen(showtimesForSelectedDate);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[#E4E7EC] shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-[#C8A951] hover:text-[#DFBD69] transition duration-300 mb-2"
          >
            <FaArrowLeft className="mr-2" />
            Back to Movies
          </button>
          <h1 className="text-3xl font-bold text-[#C8A951]">Select Showtime</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Movie Info Section */}
        <div
          className="bg-[var(--bg-card)] border border-[#E4E7EC] rounded-2xl p-6 mb-8"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Movie Poster */}
            <div className="flex-shrink-0">
              <img
                src={
                  movie.imageUrl && movie.imageUrl.startsWith('http') 
                    ? movie.imageUrl // Use Cloudinary URL directly
                    : getMovieImage(movie.name) || movie.imageUrl
                }
                alt={movie.name}
                className="w-48 h-72 object-cover object-center rounded-2xl border border-[#E4E7EC]"
                loading="lazy"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300x450/1a1a1a/c8a951?text=No+Image';
                }}
              />
            </div>

            {/* Movie Details */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">{movie.name}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center text-[var(--text-secondary)]">
                  <FaFilm className="text-[#C8A951] mr-2" />
                  <span>Genre: {movie.genre}</span>
                </div>
                <div className="flex items-center text-[var(--text-secondary)]">
                  <FaLanguage className="text-[#C8A951] mr-2" />
                  <span>Language: {movie.language}</span>
                </div>
                <div className="flex items-center text-[var(--text-secondary)]">
                  <FaClock className="text-[#C8A951] mr-2" />
                  <span>Duration: {movie.duration} mins</span>
                </div>
                <div className="flex items-center text-[var(--text-secondary)]">
                  <FaStar className="text-[#C8A951] mr-2" />
                  <span>Rating: {movie.ratings}/10</span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-[#C8A951] font-semibold mb-2">Cast</h3>
                <p className="text-[var(--text-secondary)]">{movie.cast}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-[#C8A951] font-semibold mb-2">Summary</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{movie.summary}</p>
              </div>

              {/* Today's Quick Info */}
              {(() => {
                const todayShowtimes = getTodayShowtimes();
                const availableToday = todayShowtimes.filter(isShowtimeBookable);
                const uniqueScreensToday = [...new Set(todayShowtimes.map(s => s.screen))];
                
                if (todayShowtimes.length > 0) {
                  return (
                    <div className="mt-4 p-4 bg-[var(--bg-muted)] border border-[#E4E7EC] rounded-2xl">
                      <h4 className="text-[#C8A951] font-semibold mb-3 flex items-center">
                        <FaClock className="mr-2" />
                        Today's Schedule
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-[#475467]">Screens Available:</span>
                          <div className="text-[var(--text-primary)] font-medium">
                            {uniqueScreensToday.join(', ')}
                          </div>
                        </div>
                        <div>
                          <span className="text-[#475467]">Shows Available:</span>
                          <div className="text-[var(--text-primary)] font-medium">
                            {availableToday.length} of {todayShowtimes.length}
                          </div>
                        </div>
                      </div>
                      {availableToday.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[#475467] text-sm">Next Show:</span>
                          <div className="text-[#C8A951] font-medium">
                            {availableToday[0].screen} at {formatTime(availableToday[0].startTime)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Today's or Next Available Showtimes */}
        {(() => {
          const todayShowtimes = getTodayShowtimes();
          const availableDates = getAvailableDates();
          
          // If we have today's showtimes, show them
          if (todayShowtimes.length > 0) {
            const todayGrouped = groupShowtimesByScreen(todayShowtimes);
            
            return (
              <div
                className="bg-gradient-to-r from-[#FFF9F0] via-[#FFF5E9] to-[#F7F1EB] border border-[#F4E4C2] rounded-2xl p-6 mb-8"
                style={{ boxShadow: 'var(--shadow-soft)' }}
              >
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4 flex items-center">
                  <FaClock className="mr-3" />
                  Today's Shows - {formatDate(getTodayDate())} ({todayShowtimes.length} shows)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(todayGrouped).map(([screen, screenShowtimes]) => (
                    <div key={screen} className="bg-[var(--bg-card)] border border-[#E4E7EC] rounded-2xl p-4">
                      <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                        <FaTv className="mr-2" />
                        {screen}
                      </h4>
                      
                      <div className="space-y-2">
                        {screenShowtimes.map(showtime => {
                          const isBookable = isShowtimeBookable(showtime);
                          const timeDisplay = formatTime(showtime.startTime);
                          const endTimeDisplay = formatTime(showtime.endTime);
                          
                          return (
                            <div key={showtime._id}>
                              {isBookable ? (
                                <Link to={`/tickets/${movieId}/${showtime._id}`} className="block">
                                  <div className="bg-white border border-[#E4E7EC] rounded-2xl p-3 hover:border-[#C8A951] hover:shadow-[0_15px_35px_rgba(198,157,60,0.2)] transition-all duration-300 cursor-pointer">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="text-[var(--text-primary)] font-semibold text-lg">{timeDisplay}</div>
                                        <div className="text-[#475467] text-sm">Ends: {endTimeDisplay}</div>
                                        <div className="text-[#C8A951] text-xs mt-1">₹150 onwards</div>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <div className="w-3 h-3 rounded-full bg-green-500 mb-1"></div>
                                        <span className="text-green-600 text-xs font-semibold">Available</span>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              ) : (
                                <div className="bg-[#F2F4F7] border border-[#E4E7EC] rounded-2xl p-3 opacity-70">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="text-[#98A2B3] font-semibold text-lg">{timeDisplay}</div>
                                      <div className="text-[#98A2B3] text-sm">Ends: {endTimeDisplay}</div>
                                      <div className="text-[#98A2B3] text-xs mt-1">
                                        {showtime.isArchived ? 'Archived' : 'Booking Closed'}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <div className="w-3 h-3 rounded-full bg-red-500 mb-1"></div>
                                      <span className="text-[#D64545] text-xs font-semibold">Unavailable</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                {todayShowtimes.filter(isShowtimeBookable).length === 0 && (
                  <div className="text-center py-4 mt-4 bg-[#FFF4E5] border border-[#F4C38C] rounded-2xl">
                    <p className="text-[#C35000]">All today's shows have closed booking or ended.</p>
                  </div>
                )}
              </div>
            );
          }
          
          // If no shows today but there are shows on other dates, show the next available date
          if (availableDates.length > 0) {
            const nextDate = availableDates[0]; // First available date
            const nextDateShowtimes = getShowtimesForDate(nextDate);
            const nextDateGrouped = groupShowtimesByScreen(nextDateShowtimes);
            
            return (
              <div
                className="bg-gradient-to-r from-[#FFF9F0] via-[#FFF5E9] to-[#F7F1EB] border border-[#F4E4C2] rounded-2xl p-6 mb-8"
                style={{ boxShadow: 'var(--shadow-soft)' }}
              >
                <div className="text-center mb-4">
                  <div className="bg-[var(--bg-card)] border border-[#F4C38C] rounded-2xl p-3 mb-4">
                    <p className="text-[#C35000] font-semibold">No Shows Today ({formatDate(getTodayDate())})</p>
                    <p className="text-[#475467] text-sm">Next available shows:</p>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4 flex items-center justify-center">
                  <FaClock className="mr-3" />
                  {formatDate(nextDate)} - Next Available ({nextDateShowtimes.length} shows)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(nextDateGrouped).map(([screen, screenShowtimes]) => (
                    <div key={screen} className="bg-[var(--bg-card)] border border-[#E4E7EC] rounded-2xl p-4">
                      <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                        <FaTv className="mr-2" />
                        {screen}
                      </h4>
                      
                      <div className="space-y-2">
                        {screenShowtimes.map(showtime => {
                          const isBookable = isShowtimeBookable(showtime);
                          const timeDisplay = formatTime(showtime.startTime);
                          const endTimeDisplay = formatTime(showtime.endTime);
                          
                          return (
                            <div key={showtime._id}>
                              {isBookable ? (
                                <Link to={`/tickets/${movieId}/${showtime._id}`} className="block">
                                  <div className="bg-white border border-[#E4E7EC] rounded-2xl p-3 hover:border-[#C8A951] hover:shadow-[0_15px_35px_rgba(198,157,60,0.2)] transition-all duration-300 cursor-pointer">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="text-[var(--text-primary)] font-semibold text-lg">{timeDisplay}</div>
                                        <div className="text-[#475467] text-sm">Ends: {endTimeDisplay}</div>
                                        <div className="text-[#C8A951] text-xs mt-1">₹150 onwards</div>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <div className="w-3 h-3 rounded-full bg-green-500 mb-1"></div>
                                        <span className="text-green-600 text-xs font-semibold">Available</span>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              ) : (
                                <div className="bg-[#F2F4F7] border border-[#E4E7EC] rounded-2xl p-3 opacity-70">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="text-[#98A2B3] font-semibold text-lg">{timeDisplay}</div>
                                      <div className="text-[#98A2B3] text-sm">Ends: {endTimeDisplay}</div>
                                      <div className="text-[#98A2B3] text-xs mt-1">Booking Closed</div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <div className="w-3 h-3 rounded-full bg-red-500 mb-1"></div>
                                      <span className="text-[#D64545] text-xs font-semibold">Unavailable</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          
          // No showtimes at all
          return (
            <div className="bg-[var(--bg-card)] border border-[#E4E7EC] rounded-2xl p-6 mb-8 text-center" style={{ boxShadow: 'var(--shadow-soft)' }}>
              <FaClock className="text-4xl text-[#C8A951]/60 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Showtimes Available</h3>
              <p className="text-[#475467]">Showtimes for this movie will be added soon.</p>
            </div>
          );
        })()}

        {/* Date Selection */}
        {availableDates.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-[#C8A951] mb-4 flex items-center">
              <FaCalendarAlt className="mr-2" />
              Select Date
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availableDates.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-4 py-3 rounded-lg border transition duration-300 ${
                    selectedDate === date
                      ? 'bg-[#C8A951] text-[#0D0D0D] border-[#C8A951]'
                      : 'bg-white text-[var(--text-primary)] border-[#E4E7EC] hover:border-[#C8A951] hover:bg-[#FFF6EA]'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">{formatDate(date)}</div>
                    <div className="text-sm opacity-75">
                      {new Date(date).toLocaleDateString('en-US', { year: 'numeric' })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Showtimes Section */}
        <div>
          <h3 className="text-xl font-bold text-[#C8A951] mb-4 flex items-center">
            <FaClock className="mr-2" />
            Available Showtimes - {formatDate(selectedDate)}
          </h3>

          {Object.keys(groupedShowtimes).length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[#E4E7EC] rounded-2xl p-8 text-center" style={{ boxShadow: 'var(--shadow-soft)' }}>
              <FaTv className="text-6xl text-[#C8A951]/50 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Showtimes Available</h4>
              <p className="text-[#475467]">
                There are no available showtimes for this date. Please select another date.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedShowtimes).map(([screen, screenShowtimes]) => (
                <div key={screen} className="bg-[var(--bg-card)] border border-[#E4E7EC] rounded-2xl p-6" style={{ boxShadow: 'var(--shadow-soft)' }}>
                  <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                    <FaTv className="mr-2" />
                    {screen}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {screenShowtimes.map(showtime => {
                      const isBookable = isShowtimeBookable(showtime);
                      const timeDisplay = formatTime(showtime.startTime);
                      
                      return (
                        <div key={showtime._id}>
                          {isBookable ? (
                            <Link to={`/tickets/${movieId}/${showtime._id}`} className="block">
                              <button className="w-full bg-white border-2 border-[#E4E7EC] text-[var(--text-primary)] py-3 px-4 rounded-2xl hover:border-[#C8A951] hover:bg-[#FFF6EA] transition-all duration-300 transform hover:scale-105 shadow-sm">
                                <div className="text-lg font-semibold">{timeDisplay}</div>
                                <div className="text-sm text-[#475467]">
                                  {formatTime(showtime.endTime)}
                                </div>
                                <div className="text-xs mt-1 text-[#98A2B3]">
                                  ₹150 onwards
                                </div>
                              </button>
                            </Link>
                          ) : (
                            <button 
                              disabled
                              className="w-full bg-[#F2F4F7] border-2 border-[#E4E7EC] text-[#98A2B3] py-3 px-4 rounded-2xl cursor-not-allowed"
                            >
                              <div className="text-lg font-semibold">{timeDisplay}</div>
                              <div className="text-sm">
                                {formatTime(showtime.endTime)}
                              </div>
                              <div className="text-xs mt-1">
                                {showtime.isArchived ? 'Archived' : 'Booking Closed'}
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-[var(--bg-card)] border border-[#E4E7EC] rounded-2xl p-6" style={{ boxShadow: 'var(--shadow-soft)' }}>
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Booking Information</h4>
          <ul className="text-[#475467] space-y-2 text-sm">
            <li>• Booking closes 15 minutes before showtime</li>
            <li>• Standard seats start from ₹150</li>
            <li>• Premium seats start from ₹180</li>
            <li>• VIP seats start from ₹250</li>
            <li>• Two-wheeler parking: ₹50</li>
            <li>• Four-wheeler parking: ₹100</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;