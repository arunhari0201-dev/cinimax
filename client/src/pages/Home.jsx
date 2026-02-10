
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
      background: '#FFFFFF',
      color: '#1F2933',
      icon: 'info',
      confirmButtonText: 'Close',
      showCloseButton: true,
      closeButtonAriaLabel: 'Close modal',
      customClass: {
        popup: 'animated fadeIn', // Fade-in effect on modal popup
        title: 'text-2xl font-bold',
        htmlContainer: 'p-6 text-lg leading-relaxed',
        icon: 'text-[#C8A951]',
        confirmButton: 'bg-white border border-[#C8A951] text-[#1F2933] hover:shadow-lg transition-all duration-300',
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

      <div className="movie-grid grid grid-cols-1 gap-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredMovies.map((movie) => (
          <div
            key={movie._id}
            className="group flex flex-col md:flex-row bg-white border border-[#E5E7EB] rounded-[22px] overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_35px_90px_rgba(15,23,42,0.18)] w-full min-h-[260px]"
            style={{ boxShadow: '0 25px 70px rgba(15, 23, 42, 0.12)' }}
          >
            <div
              onClick={() => showMovieDetails(movie)}
              className="relative w-full md:w-[38%] min-h-[220px] md:min-h-[260px] cursor-pointer overflow-hidden"
            >
              <img
                src={
                  movie.imageUrl && movie.imageUrl.startsWith('http')
                    ? movie.imageUrl
                    : imageMap[movie.imageUrl] || '/src/images/new.jpg'
                }
                alt={movie.name || 'Movie Poster'}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  e.target.src = '/src/images/new.jpg';
                }}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="bg-white text-[#C8A951] text-xs font-semibold px-3 py-1 rounded-md shadow-sm flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faStar} className="text-sm" />
                  {movie.ratings}
                </span>
                <span className="bg-white text-[#E50914] text-[11px] font-semibold px-3 py-1 rounded-md shadow-sm flex items-center gap-2">
                  <FontAwesomeIcon icon={faThumbsUp} /> {movie.votes} votes
                </span>
              </div>
              <div className="absolute bottom-4 left-4">
                <p className="text-white/70 text-[0.6rem] uppercase tracking-[0.4em]">Now Showing</p>
                <h3 className="text-white text-xl font-semibold mt-1 drop-shadow-sm">
                  {movie.title || movie.name}
                </h3>
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-white">
              <div className="flex-1 px-6 pt-6 pb-4 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[#98A2B3]">Featured</p>
                    <h3 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
                      {movie.title || movie.name}
                    </h3>
                    <p className="text-sm text-[#98A2B3] mt-1">
                      {(movie.genre && typeof movie.genre === 'string') ? movie.genre.split(',')[0] : 'Feature Film'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-[#98A2B3]">Certification</p>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">{movie.certificate || 'U/A 13+'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-[#98A2B3]">
                  <span>{Array.isArray(movie.language) ? movie.language[0] : movie.language || 'Multiple'}</span>
                  <span className="w-1 h-1 rounded-full bg-[#D0D5DD]"></span>
                  <span>{movie.duration || '140 min'}</span>
                  <span className="w-1 h-1 rounded-full bg-[#D0D5DD]"></span>
                  <span>{movie.format || 'IMAX'}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                
                {/* Show screen and timing from showtimes if available */}
                {(() => {
                  // Check if movie has valid showtimes
                  if (!hasValidShowtimes(movie)) {
                    return (
                      <>
                      {/* Screen Info */}
                      <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                        <FontAwesomeIcon icon={faTv} className="text-[#C8A951] text-xl flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm text-[#475467] font-semibold block mb-1">Screen</span>
                          <span className="text-[#C8A951] font-semibold text-base">TBA (Coming Soon)</span>
                        </div>
                      </div>
                      
                      {/* Show Time Info */}
                      <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                        <FontAwesomeIcon icon={faClock} className="text-[#C8A951] text-xl flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm text-[#475467] font-semibold block mb-1">Show Time</span>
                          <span className="text-[#C8A951] font-semibold text-base">TBA (Coming Soon)</span>
                        </div>
                      </div>
                      
                      {/* Language Info */}
                      <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                        <FontAwesomeIcon icon={faLanguage} className="text-[#C8A951] text-xl flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm text-[#475467] font-semibold block mb-1">Language</span>
                          <span className="text-[var(--text-primary)] font-semibold text-base">{Array.isArray(movie.language) ? movie.language.join(', ') : movie.language}</span>
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
                  <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                    <FontAwesomeIcon icon={faTv} className="text-[#C8A951] text-xl flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-[#475467] font-semibold block mb-1">Screen</span>
                      <span className="text-[var(--text-primary)] font-semibold text-base">{firstValidShowtime.screen}</span>
                    </div>
                  </div>
                  
                  {/* Show Time Info */}
                  <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                    <FontAwesomeIcon icon={faClock} className="text-[#C8A951] text-xl flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-[#475467] font-semibold block mb-1">Show Time</span>
                      <span className="text-[var(--text-primary)] font-semibold text-sm leading-relaxed">
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
                  <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                    <FontAwesomeIcon icon={faLanguage} className="text-[#C8A951] text-xl flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-[#475467] font-semibold block mb-1">Language</span>
                      <span className="text-[var(--text-primary)] font-semibold text-base">{movie.language}</span>
                    </div>
                  </div>
                    
                    {/* Time Slot Category */}
                    <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                      <FontAwesomeIcon icon={faTheaterMasks} className="text-[#C8A951] text-xl flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm text-[#475467] font-semibold block mb-2">Time Slot</span>
                        <span className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg font-bold text-sm ${
                          firstValidShowtime.screen === 'Screen 1' 
                            ? 'bg-[#FFF6EA] text-[#8E6A17] border border-[#F5D7A1]' // Morning
                            : firstValidShowtime.screen === 'Screen 2'
                            ? 'bg-[#FFEFE3] text-[#C35000] border border-[#F8C9A8]' // Afternoon
                            : 'bg-[#F4EAFF] text-[#6C2FB9] border border-[#DCC7FF]' // Night
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
                  <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                    <FontAwesomeIcon icon={faTv} className="text-[#C8A951] text-xl flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-[#475467] font-semibold block mb-1">Screen</span>
                      <span className="text-[var(--text-primary)] font-semibold text-base">{movie.screen || 'TBA'}</span>
                    </div>
                  </div>
                  
                  {/* Timing Info */}
                  <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                    <FontAwesomeIcon icon={faClock} className="text-[#C8A951] text-xl flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-[#475467] font-semibold block mb-1">Timing</span>
                      <span className="text-[var(--text-primary)] font-semibold text-base">{movie.timing || 'TBA'}</span>
                    </div>
                  </div>
                  
                  {/* Language Info */}
                  <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[#E7E9F0] bg-[#FCFCFD] shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                    <FontAwesomeIcon icon={faLanguage} className="text-[#C8A951] text-xl flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-[#475467] font-semibold block mb-1">Language</span>
                      <span className="text-[var(--text-primary)] font-semibold text-base">{Array.isArray(movie.language) ? movie.language.join(', ') : movie.language}</span>
                    </div>
                  </div>
                  </>
                );
                })()}
                </div>
              </div>

              <div className="px-6 pb-5 pt-4 border-t border-[#E7E9F0] bg-[#FBFBFC]">
                {/* Primary: Real-time booking button with cutoff validation */}
                {(() => {
                  // Check if movie has valid showtimes
                  if (!hasValidShowtimes(movie)) {
                    return (
                      <div className="space-y-2">
                        <button
                          className="bg-[#F2F4F7] border-2 border-[#E4E7EC] text-[#98A2B3] font-poppins font-semibold py-3 px-6 cursor-not-allowed w-full flex items-center justify-center rounded-lg"
                          disabled
                        >
                          <span className="mr-2">Book Tickets</span>
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </button>
                        <p className="text-[#8E6A17] text-sm font-poppins">
                          Movie added - Showtimes will be available soon!
                        </p>
                        <Link to={`/movie/${movie._id}`} className="block">
                          <button
                            className="w-full bg-white border border-dashed border-[#D0D5DD] text-[#475467] font-poppins font-medium py-3 px-4 transition-all duration-300 hover:border-[#EE1D25] hover:text-[#EE1D25] rounded-lg"
                          >
                            View Showtimes
                          </button>
                        </Link>
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
                            className="bg-[#F2F4F7] border-2 border-[#E4E7EC] text-[#98A2B3] font-poppins font-semibold py-3 px-6 cursor-not-allowed w-full flex items-center justify-center rounded-lg"
                            disabled
                          >
                            <span className="mr-2">Book Tickets</span>
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          </button>
                          <p className="text-[#D64545] text-sm font-poppins">
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
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <Link to={`/tickets/${movie._id}/${showtimeId}`} className="w-full sm:w-auto flex-1">
                            <button
                              className="w-full bg-[#EE1D25] border-2 border-[#EE1D25] text-white font-poppins font-semibold py-3 px-6 transition-all duration-300 hover:bg-[#d91219] hover:shadow-[0_15px_35px_rgba(238,29,37,0.35)] rounded-lg"
                            >
                              Book Tickets
                            </button>
                          </Link>
                          <Link to={`/movie/${movie._id}`} className="w-full sm:w-auto flex-1">
                            <button
                              className="w-full bg-white border border-dashed border-[#D0D5DD] text-[#475467] font-poppins font-medium py-3 px-4 transition-all duration-300 hover:border-[#EE1D25] hover:text-[#EE1D25] rounded-lg"
                            >
                              View Showtimes
                            </button>
                          </Link>
                        </div>
                        {timeRemaining && (
                          <p className="text-[#8E6A17] text-xs font-poppins text-center mt-3">
                            Booking closes in {timeRemaining}
                          </p>
                        )}
                      </>
                    );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
};

export default Home;
