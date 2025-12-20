
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTheaterMasks, faStar, faThumbsUp, faFilm, faTv, faLanguage, faClock, faSync } from '@fortawesome/free-solid-svg-icons';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import withReactContent from 'sweetalert2-react-content';

import { FaFilm, FaUser, FaNewspaper, FaTag } from 'react-icons/fa'; // You can import any React icon

// Import the shared movie image utility
import { imageMap } from '../utils/movieImages';

const MySwal = withReactContent(Swal);

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { currentUser } = useSelector((state) => state.user);

  // Function to check if a showtime is still bookable
  const isShowtimeBookable = (showtime) => {
    // First check if the showtime exists and has required properties
    if (!showtime || !showtime.startTime || !showtime.endTime) {
      console.log('Showtime invalid or missing required properties');
      return false;
    }
    
    const currentTime = new Date();
    
    // Get all relevant time data
    const showtimeStart = new Date(showtime.startTime);
    const showtimeEnd = new Date(showtime.endTime);
    const cutoffMinutes = showtime.cutoffMinutes || 5; // Default 5 minutes cutoff
    const cutoffTime = new Date(showtimeStart.getTime() - (cutoffMinutes * 60000));
    
    // Calculate time differences for better debugging
    const minutesUntilStart = Math.floor((showtimeStart - currentTime) / (1000 * 60));
    const minutesUntilEnd = Math.floor((showtimeEnd - currentTime) / (1000 * 60));
    const minutesUntilCutoff = Math.floor((cutoffTime - currentTime) / (1000 * 60));
    
    // Debug logging with enhanced information
    console.log('Showtime check:', {
      movieId: showtime.movieId?.name || showtime.movieId,
      screen: showtime.screen,
      currentTime: currentTime.toLocaleString(),
      showtimeStart: showtimeStart.toLocaleString(),
      showtimeEnd: showtimeEnd.toLocaleString(),
      cutoffTime: cutoffTime.toLocaleString(),
      isAfterCutoff: currentTime > cutoffTime,
      isAfterStart: currentTime > showtimeStart,
      isAfterEnd: currentTime > showtimeEnd,
      isArchived: showtime.isArchived,
      minutesUntilStart,
      minutesUntilEnd,
      minutesUntilCutoff,
      bookingAvailable: showtime.bookingAvailable
    });
    
    // If the backend already determined booking availability, use that value
    if (showtime.hasOwnProperty('bookingAvailable')) {
      const result = showtime.bookingAvailable === true;
      console.log(`Using backend bookingAvailable value: ${result}`);
      return result;
    }
    
    // Otherwise, check all conditions manually
    
    // Check if showtime is archived
    if (showtime.isArchived) {
      console.log('Showtime is archived');
      return false;
    }
    
    // Check if showtime has already ended
    if (currentTime > showtimeEnd) {
      console.log('Showtime has already ended');
      return false;
    }
    
    // Check if showtime has already started
    if (currentTime > showtimeStart) {
      console.log('Showtime has already started');
      return false;
    }
    
    // Check if cutoff time has passed
    if (currentTime > cutoffTime) {
      console.log('Cutoff time has passed');
      return false;
    }
    
    return true;
  };

  // Function to get time remaining until cutoff
  const getTimeUntilCutoff = (showtime) => {
    if (!showtime || !showtime.startTime) return null;
    
    // First check if the showtime is bookable
    if (!isShowtimeBookable(showtime)) return null;
    
    const currentTime = new Date();
    
    // startTime is already a complete Date object
    const showtimeStart = new Date(showtime.startTime);
    
    const cutoffMinutes = showtime.cutoffMinutes || 5;
    const cutoffTime = new Date(showtimeStart.getTime() - (cutoffMinutes * 60000));
    
    const timeDiff = cutoffTime - currentTime;
    
    if (timeDiff <= 0) return null;
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    // Also show seconds if less than 10 minutes remaining
    if (hours === 0 && minutes < 10) {
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      return `${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Helper function to retry requests with exponential backoff (for Render cold starts)
  const retryRequest = async (requestFn, maxRetries = 3, initialDelay = 2000) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        const isServerDown = error.response?.status === 503 || 
                            error.code === 'ERR_NETWORK' ||
                            error.message?.includes('Network Error');
        
        if (isServerDown && attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(`Server might be waking up... Retry ${attempt + 1}/${maxRetries} in ${delay/1000}s`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  };

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const backendUrl = 
        process.env.NODE_ENV === 'production' 
          ? 'https://cinimax.onrender.com' 
          : 'http://localhost:5000';
      
      // First, trigger archiving of past showtimes (with retry for cold starts)
      console.log("Triggering archive check before fetching movies");
      try {
        const token = localStorage.getItem('access_token');
        await retryRequest(() => 
          axios.post(`${backendUrl}/api/showtimes/force-archive`, {}, {
            withCredentials: true,
            timeout: 30000, // 30 second timeout for cold starts
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          })
        );
        console.log("Archive process completed");
      } catch (archiveErr) {
        console.error("Error running archive process:", archiveErr);
        // Continue anyway to show available movies
      }
          
      // Now fetch the updated movie list (with retry for cold starts)
      const response = await retryRequest(() => 
        axios.get(`${backendUrl}/api/movies`, {
          withCredentials: true,
          timeout: 30000, // 30 second timeout for cold starts
        })
      );

      // The response now includes movies with their showtimes
      console.log(`Fetched ${response.data.length} movies`);
      
      // Show all movies, don't filter based on showtimes
      console.log(`Showing all ${response.data.length} movies`);
      
      // Filter out movies with only past showtimes
      const currentDate = new Date();
      const startOfToday = new Date(currentDate);
      startOfToday.setHours(0, 0, 0, 0);
      
      const moviesWithFutureShowtimes = response.data.filter(movie => {
        if (!movie.showtimes || movie.showtimes.length === 0) {
          return true; // Keep movies without showtimes
        }
        
        // Check if movie has any future showtimes (today or later)
        const hasFutureShowtimes = movie.showtimes.some(showtime => {
          const showtimeDate = new Date(showtime.date);
          return showtimeDate >= startOfToday && !showtime.isArchived;
        });
        
        return hasFutureShowtimes;
      });
      
      console.log(`Movies with future showtimes: ${moviesWithFutureShowtimes.length}`);
      setMovies(moviesWithFutureShowtimes);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching movies:", err);
      const isServerDown = err.response?.status === 503 || 
                          err.code === 'ERR_NETWORK' ||
                          err.message?.includes('Network Error');
      if (isServerDown) {
        setError('Server is starting up. Please refresh in 30-60 seconds.');
      } else {
        setError('Failed to fetch movies. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh data every minute to ensure showtimes are current
  useEffect(() => {
    fetchMovies();
    
    // Set up interval to refresh movies every minute
    const intervalId = setInterval(() => {
      console.log("Running scheduled refresh of movies");
      fetchMovies();
    }, 60000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);

  const showMovieDetails = (movie) => {
    MySwal.fire({
      title: (
        <div className="flex items-center">
          <FaFilm className="mr-3 text-[#C8A951]" size={24} style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.4))'}} />
          <strong className="font-cinzel text-[#C8A951]" style={{textShadow: '0 0 5px rgba(200, 169, 81, 0.2)'}}>{movie.title || movie.name}</strong>
        </div>
      ),
      html: (
        <div className="space-y-6 font-poppins">
          <div className="flex items-center">
            <FaTag className="mr-3 text-[#C8A951]" size={20} style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
            <p><strong className="text-[#C8A951]">Genre:</strong> <span className="text-[#F5F5F5]">{movie.genre}</span></p>
          </div>
          <div className="flex items-center">
            <FaUser className="mr-3 text-[#C8A951]" size={20} style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
            <p><strong className="text-[#C8A951]">Cast:</strong> <span className="text-[#F5F5F5]">{Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast}</span></p>
          </div>
          <div className="flex items-start">
            <FaNewspaper className="mr-3 mt-1 text-[#C8A951]" size={20} style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
            <p><strong className="text-[#C8A951]">Summary:</strong> <span className="text-[#F5F5F5]">{movie.summary}</span></p>
          </div>
        </div>
      ),
      background: '#0D0D0D',
      color: '#F5F5F5',
      icon: 'info',
      confirmButtonText: 'Close',
      showCloseButton: true,
      closeButtonAriaLabel: 'Close modal',
      customClass: {
        popup: 'animated fadeIn', // Fade-in effect on modal popup
        title: 'text-2xl font-bold',
        htmlContainer: 'p-6 text-lg leading-relaxed',
        icon: 'text-[#C8A951]',
        confirmButton: 'bg-[#0D0D0D] border border-[#C8A951] text-[#F5F5F5] hover:shadow-lg transition-all duration-300',
      },
      didOpen: () => {
        const popup = document.querySelector('.swal2-popup');
        popup.style.transition = 'all 0.5s ease-in-out';
        popup.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(200, 169, 81, 0.3)';
        popup.style.border = '1px solid rgba(200, 169, 81, 0.3)';
      },
      willClose: () => {
        const popup = document.querySelector('.swal2-popup');
        popup.style.transition = 'all 0.3s ease-in-out';
      },
    });
  };

  const filteredMovies = movies
    .filter((movie) => 
      // Only filter by search query - show all movies regardless of showtime status
      (movie.title || movie.name).toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Helper function to check if a movie has valid showtimes
  const hasValidShowtimes = (movie) => {
    if (!movie.showtimes || movie.showtimes.length === 0) {
      return false;
    }
    
    const currentDate = new Date();
    const startOfToday = new Date(currentDate);
    startOfToday.setHours(0, 0, 0, 0);
    
    // Normalize date function to ensure consistent date comparison
    const normalizeDate = (dateString) => {
      const date = new Date(dateString);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
    };
    
    const getTodayDate = () => {
      const today = new Date();
      return normalizeDate(today.toISOString());
    };
    
    // Check if movie has any future (today or later) and bookable showtimes
    const validShowtimes = movie.showtimes.filter(showtime => {
      // Use startTime instead of date field for more reliable date detection
      const showtimeDate = normalizeDate(showtime.startTime);
      const today = getTodayDate();
      const isFutureDate = showtimeDate >= today;
      const isNotArchived = !showtime.isArchived;
      const isBookable = isShowtimeBookable(showtime);
      
      return isFutureDate && isNotArchived && isBookable;
    });
    
    return validShowtimes.length > 0;
  };

  const fontFamily = 'font-sans';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D] text-[#F5F5F5]">
        <div className="flex items-center space-x-4 mb-4">
          <FontAwesomeIcon icon={faTheaterMasks} className="text-6xl text-[#C8A951]" style={{filter: 'drop-shadow(0 0 10px rgba(200, 169, 81, 0.4))'}} />
          <h1 className="text-3xl font-playfair font-semibold text-[#C8A951]" style={{textShadow: '0 0 10px rgba(200, 169, 81, 0.3)'}}>Cinematic Popcorn Park</h1>
        </div>
        <div className="text-center text-2xl font-cinzel text-[#F5F5F5] mt-20 animate-pulse">
          Loading your experience...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D] text-[#E50914]">
        <div className="text-center mt-10 font-poppins">
          {error}
        </div>
      </div>
    );
  }

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchMovies();
    setTimeout(() => setRefreshing(false), 1000); // Show refresh animation for at least 1 second
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] p-4 sm:p-6 lg:p-8 font-poppins">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <h1 className="text-3xl lg:text-4xl font-playfair font-bold text-center text-[#C8A951] tracking-wide flex items-center justify-center" style={{textShadow: '0 0 10px rgba(200, 169, 81, 0.3)'}}>
          <FontAwesomeIcon icon={faTheaterMasks} className="mr-3 text-[#C8A951]" style={{filter: 'drop-shadow(0 0 5px rgba(200, 169, 81, 0.4))'}} />
          Now Showing
        </h1>
        
        <button 
          onClick={handleManualRefresh}
          disabled={refreshing}
          className={`mt-4 md:mt-0 px-4 py-2 flex items-center justify-center rounded border border-[#C8A951]/30 hover:border-[#C8A951] text-[#C8A951] transition-all duration-300 ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FontAwesomeIcon 
            icon={faSync} 
            className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} 
            style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.4))'}} 
          />
          {refreshing ? 'Refreshing...' : 'Refresh Showtimes'}
        </button>
      </div>

      {/* Display logged-in user's email */}
      {currentUser && (
        <div className="text-center text-lg mb-8 text-[#C8A951] font-cinzel">
          <p>Welcome, {currentUser.email}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6 lg:mb-8 flex justify-center px-2 sm:px-0">
        <div className="flex items-center bg-[#0D0D0D] border border-[#C8A951]/30 shadow-lg transition-all duration-300 hover:border-[#C8A951] rounded-lg overflow-hidden max-w-md w-full" style={{boxShadow: '0 0 15px rgba(0, 0, 0, 0.4)'}}>
          <FontAwesomeIcon icon={faSearch} className="text-[#C8A951] p-3" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
          <input
            type="text"
            placeholder="Search for a movie..."
            className="p-3 bg-[#0D0D0D] text-[#F5F5F5] focus:outline-none transition-all duration-300 ease-in-out w-full font-poppins"
            style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'}}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="movie-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 md:gap-10 lg:gap-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredMovies.map((movie) => (
          <div
            key={movie._id}
            className="relative group bg-[#0D0D0D] border border-[#C8A951]/20 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:border-[#C8A951]/80 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] hover:scale-[1.03] backdrop-blur-sm max-w-md mx-auto"
            style={{boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(200, 169, 81, 0.15)'}}
          >
            <div
              className="relative overflow-hidden cursor-pointer p-4"
              onClick={() => showMovieDetails(movie)}
            >
              <div className="aspect-square w-full max-w-sm mx-auto bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#C8A951]/10 shadow-inner">
                <img
                  src={
                    movie.imageUrl && movie.imageUrl.startsWith('http') 
                      ? movie.imageUrl // Use Cloudinary URL directly
                      : imageMap[movie.imageUrl] || '/src/images/new.jpg'
                  }
                  alt={movie.name || 'Movie Poster'}
                  className="w-full h-full object-cover object-center transition-all duration-700 group-hover:scale-110"
                  onError={(e) => {
                    // Fallback if Cloudinary image fails to load
                    e.target.src = '/src/images/new.jpg';
                  }}
                  loading="lazy"
                />
              </div>
              <div className="absolute bottom-2 left-2 right-2 bg-[#0D0D0D]/95 flex gap-3 items-center p-3 border border-[#C8A951]/30 rounded-lg backdrop-blur-md">
                <div className="flex items-center text-[#C8A951] font-cinzel text-sm">
                  <FontAwesomeIcon icon={faStar} className="mr-2" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.6))'}} />
                  {movie.ratings}
                </div>
                <div className="flex items-center text-[#E50914] font-cinzel text-sm">
                  <FontAwesomeIcon icon={faThumbsUp} className="mr-2" style={{filter: 'drop-shadow(0 0 3px rgba(229, 9, 20, 0.6))'}} />
                  {movie.votes} Votes
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-t from-[#0D0D0D] via-[#1A1A1A] to-[#0D0D0D] text-[#F5F5F5] space-y-4 font-poppins">
              {/* Movie Title */}
              <div className="flex items-center gap-3 mb-5">
                <FontAwesomeIcon icon={faFilm} className="text-[#C8A951] text-xl flex-shrink-0" style={{filter: 'drop-shadow(0 0 4px rgba(200, 169, 81, 0.5))'}} />
                <h3 className="text-xl sm:text-2xl font-bold text-[#C8A951] font-cinzel leading-tight" style={{textShadow: '0 0 8px rgba(200, 169, 81, 0.3)'}}>
                  {movie.title || movie.name}
                </h3>
              </div>
              
              {/* Movie Details Grid */}
              <div className="space-y-4">
              
              {/* Show screen and timing from showtimes if available */}
              {(() => {
                // Check if movie has valid showtimes
                if (!hasValidShowtimes(movie)) {
                  return (
                    <>
                    {/* Screen Info */}
                    <div className="flex items-center gap-4 p-3">
                      <FontAwesomeIcon icon={faTv} className="text-[#C8A951] text-xl flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm text-[#C8A951] font-semibold block mb-1">Screen</span>
                        <span className="text-yellow-400 font-bold text-base">TBA (Coming Soon)</span>
                      </div>
                    </div>
                    
                    {/* Show Time Info */}
                    <div className="flex items-center gap-4 p-3">
                      <FontAwesomeIcon icon={faClock} className="text-[#C8A951] text-xl flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm text-[#C8A951] font-semibold block mb-1">Show Time</span>
                        <span className="text-yellow-400 font-bold text-base">TBA (Coming Soon)</span>
                      </div>
                    </div>
                    
                    {/* Language Info */}
                    <div className="flex items-center gap-4 p-3">
                      <FontAwesomeIcon icon={faLanguage} className="text-[#C8A951] text-xl flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm text-[#C8A951] font-semibold block mb-1">Language</span>
                        <span className="text-[#F5F5F5] font-bold text-base">{Array.isArray(movie.language) ? movie.language.join(', ') : movie.language}</span>
                      </div>
                    </div>
                    </>
                  );
                }
                
                // Get the first valid (non-archived and bookable) showtime
                const validShowtimes = movie.showtimes?.filter(showtime => 
                  !showtime.isArchived && isShowtimeBookable(showtime)
                );
                const firstValidShowtime = validShowtimes?.[0];
                
                return firstValidShowtime && typeof firstValidShowtime === 'object' ? (
                <>
                {/* Screen Info */}
                <div className="flex items-center gap-4 p-3">
                  <FontAwesomeIcon icon={faTv} className="text-[#C8A951] text-xl flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-[#C8A951] font-semibold block mb-1">Screen</span>
                    <span className="text-[#F5F5F5] font-bold text-base">{firstValidShowtime.screen}</span>
                  </div>
                </div>
                
                {/* Show Time Info */}
                <div className="flex items-center gap-4 p-3">
                  <FontAwesomeIcon icon={faClock} className="text-[#C8A951] text-xl flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-[#C8A951] font-semibold block mb-1">Show Time</span>
                    <span className="text-[#F5F5F5] font-bold text-sm leading-relaxed">
                      {new Date(firstValidShowtime.startTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })} - {new Date(firstValidShowtime.endTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </div>
                
                {/* Language Info */}
                <div className="flex items-center gap-4 p-3">
                  <FontAwesomeIcon icon={faLanguage} className="text-[#C8A951] text-xl flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-[#C8A951] font-semibold block mb-1">Language</span>
                    <span className="text-[#F5F5F5] font-bold text-base">{movie.language}</span>
                  </div>
                </div>
                  
                  {/* Time Slot Category */}
                  <div className="flex items-center gap-4 p-3">
                    <FontAwesomeIcon icon={faTheaterMasks} className="text-[#C8A951] text-xl flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-[#C8A951] font-semibold block mb-2">Time Slot</span>
                      <span className={`inline-flex items-center gap-3 px-4 py-2 rounded-full font-bold text-sm ${
                        firstValidShowtime.screen === 'Screen 1' 
                          ? 'bg-yellow-600/25 text-yellow-200 border border-yellow-400/40' // Morning
                          : firstValidShowtime.screen === 'Screen 2'
                          ? 'bg-orange-600/25 text-orange-200 border border-orange-400/40' // Afternoon
                          : 'bg-purple-600/25 text-purple-200 border border-purple-400/40' // Night
                      }`}>
                        {firstValidShowtime.screen === 'Screen 1' 
                          ? 'Morning Show' 
                          : firstValidShowtime.screen === 'Screen 2'
                          ? 'Afternoon Show'
                          : 'Night Show'
                        }
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                {/* Fallback to movie properties if showtimes not available */}
                {/* Screen Info */}
                <div className="flex items-center gap-4 p-3">
                  <FontAwesomeIcon icon={faTv} className="text-[#C8A951] text-xl flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-[#C8A951] font-semibold block mb-1">Screen</span>
                    <span className="text-[#F5F5F5] font-bold text-base">{movie.screen || 'TBA'}</span>
                  </div>
                </div>
                
                {/* Timing Info */}
                <div className="flex items-center gap-4 p-3">
                  <FontAwesomeIcon icon={faClock} className="text-[#C8A951] text-xl flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-[#C8A951] font-semibold block mb-1">Timing</span>
                    <span className="text-[#F5F5F5] font-bold text-base">{movie.timing || 'TBA'}</span>
                  </div>
                </div>
                
                {/* Language Info */}
                <div className="flex items-center gap-4 p-3">
                  <FontAwesomeIcon icon={faLanguage} className="text-[#C8A951] text-xl flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-[#C8A951] font-semibold block mb-1">Language</span>
                    <span className="text-[#F5F5F5] font-bold text-base">{Array.isArray(movie.language) ? movie.language.join(', ') : movie.language}</span>
                  </div>
                </div>
                </>
              );
              })()}
            </div>
            </div>

            <div className="px-6 pb-6 bg-gradient-to-t from-[#0D0D0D] to-[#1A1A1A] text-center flex flex-col gap-4">
              {/* Primary: Real-time booking button with cutoff validation */}
              {(() => {
                // Check if movie has valid showtimes
                if (!hasValidShowtimes(movie)) {
                  return (
                    <div className="space-y-2">
                      <button
                        className="bg-gray-600 border-2 border-gray-500 text-gray-300 font-playfair font-semibold py-3 px-6 cursor-not-allowed w-full flex items-center justify-center"
                        disabled
                      >
                        <span className="mr-2">No Available Showtimes</span>
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      </button>
                      <p className="text-yellow-400 text-sm font-poppins">
                        Movie added - Showtimes will be available soon!
                      </p>
                    </div>
                  );
                }
                
                // Get the first valid (non-archived and bookable) showtime
                const validShowtimes = movie.showtimes?.filter(showtime => 
                  !showtime.isArchived && isShowtimeBookable(showtime)
                );
                const firstValidShowtime = validShowtimes?.[0];
                
                const showtimeId = firstValidShowtime._id;
                const isBookable = isShowtimeBookable(firstValidShowtime);
                const timeRemaining = getTimeUntilCutoff(firstValidShowtime);
                  
                  if (!isBookable) {
                    return (
                      <div className="space-y-2">
                        <button
                          className="bg-gray-600 border-2 border-gray-500 text-gray-300 font-playfair font-semibold py-3 px-6 cursor-not-allowed w-full flex items-center justify-center"
                          disabled
                        >
                          <span className="mr-2">Booking Closed</span>
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </button>
                        <p className="text-red-400 text-sm font-poppins">
                          {firstValidShowtime ? (
                            firstValidShowtime.isArchived ? 'Show has been archived' :
                            new Date() > new Date(firstValidShowtime.endTime) ? 'Show has ended' :
                            new Date() > new Date(firstValidShowtime.startTime) ? 'Show has started' :
                            'Booking cutoff time passed'
                          ) : 'Not available for booking'}
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {/* Primary Button - View All Showtimes */}
                      <Link to={`/movie/${movie._id}`}>
                        <button
                          className="bg-[#0D0D0D] border-2 border-[#C8A951] text-[#F5F5F5] font-playfair font-semibold py-3 px-6 transition-all duration-300 hover:shadow-lg w-full flex items-center justify-center"
                          style={{boxShadow: '0 0 15px rgba(200, 169, 81, 0.3)'}}
                        >
                          <span className="mr-2">View Showtimes</span>
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        </button>
                      </Link>
                      
                      {/* Secondary Button - Quick Book First Available */}
                      <Link to={`/tickets/${movie._id}/${showtimeId}`}>
                        <button
                          className="bg-transparent border border-[#C8A951]/50 text-[#C8A951] font-playfair font-medium py-2 px-4 transition-all duration-300 hover:bg-[#C8A951]/10 hover:border-[#C8A951] w-full flex items-center justify-center text-sm"
                        >
                          <span className="mr-2">Quick Book ({firstValidShowtime.screen} - {new Date(firstValidShowtime.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })})</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        </button>
                      </Link>
                      
                      {timeRemaining && (
                        <p className="text-yellow-400 text-xs font-poppins text-center">
                          ⏰ Booking closes in {timeRemaining}
                        </p>
                      )}
                    </div>
                  );
              })()}
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
};

export default Home;
