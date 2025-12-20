import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaPlus, FaClock, FaSave, FaTimes } from 'react-icons/fa';

const backendUrl = 
  process.env.NODE_ENV === 'production' 
    ? 'https://cinimax.onrender.com' 
    : 'http://localhost:5000';

export default function MovieShowtimeManagement() {
  const { currentUser } = useSelector((state) => state.user);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form state for new/editing showtime
  const [formData, setFormData] = useState({
    screen: '',
    date: '',
    startTime: '',
    endTime: '',
    cutoffMinutes: 15
  });

  // Screens available in the theater
  const availableScreens = ['Screen 1', 'Screen 2', 'Screen 3'];

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    if (selectedMovie) {
      fetchShowtimesByMovie(selectedMovie._id);
    }
  }, [selectedMovie]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${backendUrl}/api/movies`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        setMovies(data);
      } else {
        toast.error(data.message || 'Error fetching movies');
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
      toast.error('Failed to fetch movies');
    } finally {
      setLoading(false);
    }
  };

  const fetchShowtimesByMovie = async (movieId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${backendUrl}/api/showtimes/by-movie/${movieId}`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        // Sort showtimes by date and time
        const sortedShowtimes = data.sort((a, b) => {
          return new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime);
        });
        setShowtimes(sortedShowtimes);
      } else {
        toast.error(data.message || 'Error fetching showtimes');
      }
    } catch (error) {
      console.error('Error fetching showtimes:', error);
      toast.error('Failed to fetch showtimes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMovie = (movie) => {
    setSelectedMovie(movie);
    // Reset states
    setIsEditing(false);
    setEditingShowtime(null);
    setIsAddingNew(false);
    setFormData({
      screen: '',
      date: '',
      startTime: '',
      endTime: '',
      cutoffMinutes: 15
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleEditShowtime = (showtime) => {
    // Convert ISO date to YYYY-MM-DD format for input
    const date = new Date(showtime.date);
    const formattedDate = date.toISOString().split('T')[0];
    
    // Format time for input (HH:MM)
    const startTime = new Date(showtime.startTime).toTimeString().split(' ')[0].substring(0, 5);
    const endTime = new Date(showtime.endTime).toTimeString().split(' ')[0].substring(0, 5);
    
    setFormData({
      screen: showtime.screen,
      date: formattedDate,
      startTime,
      endTime,
      cutoffMinutes: showtime.cutoffMinutes || 15
    });
    
    setEditingShowtime(showtime);
    setIsEditing(true);
    setIsAddingNew(false);
  };

  const handleAddNewShowtime = () => {
    // Set tomorrow's date as default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    
    setFormData({
      screen: availableScreens[0],
      date: formattedDate,
      startTime: '10:00',
      endTime: '12:30',
      cutoffMinutes: 15
    });
    
    setIsAddingNew(true);
    setIsEditing(false);
    setEditingShowtime(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsAddingNew(false);
    setEditingShowtime(null);
    setFormData({
      screen: '',
      date: '',
      startTime: '',
      endTime: '',
      cutoffMinutes: 15
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.screen || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create date objects for startTime and endTime
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
      
      // Validate times
      if (endDateTime <= startDateTime) {
        toast.error('End time must be after start time');
        setLoading(false);
        return;
      }
      
      const showtimeData = {
        movieId: selectedMovie._id,
        screen: formData.screen,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        date: new Date(formData.date).toISOString(),
        cutoffMinutes: parseInt(formData.cutoffMinutes) || 15
      };
      
      let res;
      
      if (isEditing) {
        // Update existing showtime
        const token = localStorage.getItem('access_token');
        res = await fetch(`${backendUrl}/api/showtimes/${editingShowtime._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include',
          body: JSON.stringify(showtimeData)
        });
      } else {
        // Create new showtime
        const token = localStorage.getItem('access_token');
        res = await fetch(`${backendUrl}/api/showtimes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include',
          body: JSON.stringify(showtimeData)
        });
      }
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(isEditing ? 'Showtime updated successfully' : 'New showtime added successfully');
        // Refresh showtimes
        fetchShowtimesByMovie(selectedMovie._id);
        // Reset form
        handleCancelEdit();
      } else {
        toast.error(data.message || 'Error processing request');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShowtime = async (showtimeId) => {
    if (!window.confirm('Are you sure you want to delete this showtime? This will also remove all seats and bookings associated with it.')) {
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${backendUrl}/api/showtimes/${showtimeId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Showtime deleted successfully');
        // Remove from list without refetching
        setShowtimes(showtimes.filter(st => st._id !== showtimeId));
      } else {
        toast.error(data.message || 'Error deleting showtime');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete showtime');
    } finally {
      setLoading(false);
    }
  };

  const formatShowtimeDate = (dateString) => {
    const options = { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatShowtimeTime = (timeString) => {
    const options = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    };
    return new Date(timeString).toLocaleTimeString(undefined, options);
  };

  const isShowtimePast = (endTimeString) => {
    const endTime = new Date(endTimeString);
    const now = new Date();
    return endTime < now;
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Movie Showtime Management</h1>
      
      {loading && !selectedMovie && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      {!loading && movies.length === 0 && (
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-yellow-700">No movies found. Please add movies first.</p>
        </div>
      )}
      
      {movies.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Movie Selection Column */}
          <div className="lg:col-span-1">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Select a Movie</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {movies.map(movie => (
                  <div 
                    key={movie._id}
                    onClick={() => handleSelectMovie(movie)}
                    className={`p-3 rounded-md cursor-pointer border transition-colors ${
                      selectedMovie && selectedMovie._id === movie._id
                        ? 'bg-blue-100 border-blue-300'
                        : 'hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <p className="font-medium">{movie.title || movie.name}</p>
                    <p className="text-sm text-gray-500">
                      Duration: {movie.duration} mins
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Showtimes Column */}
          <div className="lg:col-span-3">
            {!selectedMovie ? (
              <div className="bg-gray-50 p-8 rounded-md text-center">
                <p className="text-gray-500 text-lg">Please select a movie to manage its showtimes</p>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    Showtimes for: {selectedMovie.name}
                  </h2>
                  <button
                    onClick={handleAddNewShowtime}
                    className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-green-700"
                    disabled={isEditing || isAddingNew}
                  >
                    <FaPlus /> Add Showtime
                  </button>
                </div>
                
                {loading && (
                  <div className="flex justify-center my-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                  </div>
                )}
                
                {/* Form for adding/editing showtime */}
                {(isEditing || isAddingNew) && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-md">
                    <h3 className="font-semibold mb-4">
                      {isEditing ? 'Edit Showtime' : 'Add New Showtime'}
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Screen *
                          </label>
                          <select
                            name="screen"
                            value={formData.screen}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select Screen</option>
                            {availableScreens.map(screen => (
                              <option key={screen} value={screen}>{screen}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date *
                          </label>
                          <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Time *
                          </label>
                          <input
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Time *
                          </label>
                          <input
                            type="time"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Booking Cutoff (minutes)
                          </label>
                          <input
                            type="number"
                            name="cutoffMinutes"
                            value={formData.cutoffMinutes}
                            onChange={handleInputChange}
                            min="0"
                            max="120"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 flex items-center gap-1"
                        >
                          <FaTimes /> Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
                          disabled={loading}
                        >
                          <FaSave /> {loading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* Showtimes List */}
                {!loading && showtimes.length === 0 ? (
                  <div className="bg-gray-50 p-4 rounded-md text-center">
                    <p className="text-gray-500">No showtimes found for this movie</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {showtimes.map(showtime => (
                      <div 
                        key={showtime._id}
                        className={`p-4 rounded-md border ${
                          isShowtimePast(showtime.endTime) 
                            ? 'border-gray-200 bg-gray-50' 
                            : 'border-green-200 bg-green-50'
                        }`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {showtime.screen}
                              {isShowtimePast(showtime.endTime) && (
                                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                  Past
                                </span>
                              )}
                              {!isShowtimePast(showtime.endTime) && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                  Upcoming
                                </span>
                              )}
                            </h3>
                            <p className="text-gray-600 text-sm flex items-center gap-1">
                              <FaClock className="text-xs" /> 
                              {formatShowtimeTime(showtime.startTime)} - {formatShowtimeTime(showtime.endTime)}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {formatShowtimeDate(showtime.date)}
                            </p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditShowtime(showtime)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                              disabled={isEditing || isAddingNew || isShowtimePast(showtime.endTime)}
                              title={isShowtimePast(showtime.endTime) ? "Cannot edit past showtimes" : "Edit showtime"}
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteShowtime(showtime._id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-full"
                              disabled={isEditing || isAddingNew}
                              title="Delete showtime"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
