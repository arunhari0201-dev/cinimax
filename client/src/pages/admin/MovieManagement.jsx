import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaFilm,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaStar,
  FaClock,
  FaLanguage,
  FaTheaterMasks
} from 'react-icons/fa';

export default function MovieManagement() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    genre: '',
    language: '',
    cast: '',
    summary: '',
    imageUrl: '',
    ratings: '',
    duration: '',
    votes: ''
  });

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  useEffect(() => {
    if (!currentUser || !['admin', 'manager', 'staff'].includes(currentUser.role)) {
      navigate('/');
      return;
    }
    fetchMovies();
  }, [currentUser, navigate, currentPage, searchTerm]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm })
      });

      const response = await axios.get(`${backendUrl}/api/admin/movies?${params}`, {
        withCredentials: true
      });

      setMovies(response.data.movies);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching movies:', error);
      setError(error.response?.data?.message || 'Failed to fetch movies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovie = () => {
    setSelectedMovie(null);
    setIsEditing(false);
    setImageFile(null);
    setImagePreview('');
    setFormData({
      name: '',
      title: '',
      genre: '',
      language: '',
      cast: '',
      summary: '',
      imageUrl: '',
      ratings: '',
      duration: '',
      votes: ''
    });
    setShowMovieModal(true);
  };

  const handleEditMovie = (movie) => {
    setSelectedMovie(movie);
    setIsEditing(true);
    setImageFile(null);
    setImagePreview(movie.imageUrl || '');
    setFormData({
      name: movie.title || movie.name || '',
      title: movie.title || movie.name || '',
      genre: movie.genre || '',
      language: Array.isArray(movie.language) ? movie.language.join(', ') : (movie.language || ''),
      cast: Array.isArray(movie.cast) ? movie.cast.join(', ') : (movie.cast || ''),
      summary: movie.summary || '',
      imageUrl: movie.imageUrl || movie.poster || '',
      ratings: movie.ratings || '',
      duration: movie.duration || '',
      votes: movie.votes || ''
    });
    setShowMovieModal(true);
  };

  const handleDeleteMovie = async (movieId, movieName) => {
    if (!window.confirm(`Are you sure you want to delete "${movieName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${backendUrl}/api/admin/movies/${movieId}`, {
        withCredentials: true
      });
      fetchMovies();
    } catch (error) {
      console.error('Error deleting movie:', error);
      alert(error.response?.data?.message || 'Failed to delete movie');
    }
  };

  const handleSubmitMovie = async (e) => {
    e.preventDefault();
    
    try {
      let finalFormData = { ...formData };
      
      // Upload image if a new file is selected
      if (imageFile) {
        const uploadedImageUrl = await uploadImage();
        finalFormData.imageUrl = uploadedImageUrl;
      }
      
      if (isEditing) {
        await axios.put(`${backendUrl}/api/admin/movies/${selectedMovie._id}`, 
          finalFormData,
          { withCredentials: true }
        );
      } else {
        await axios.post(`${backendUrl}/api/admin/movies`, 
          finalFormData,
          { withCredentials: true }
        );
      }
      
      setShowMovieModal(false);
      fetchMovies();
    } catch (error) {
      console.error('Error saving movie:', error);
      alert(error.response?.data?.message || error.message || 'Failed to save movie');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await axios.post(
        `${backendUrl}/api/admin/movies/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true
        }
      );
      
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading && movies.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-6xl text-[#C8A951] animate-spin mb-4" />
          <p className="text-[#F5F5F5] text-lg">Loading movies...</p>
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
              <FaFilm className="mr-3" />
              Movie Management
            </h1>
            <p className="text-[#F5F5F5]/70">Manage all movies in the system</p>
          </div>
          <div className="flex space-x-4">
            {['admin', 'manager'].includes(currentUser.role) && (
              <button 
                onClick={handleAddMovie}
                className="bg-[#C8A951] text-[#0D0D0D] px-4 py-2 rounded hover:bg-[#DFBD69] transition duration-300 flex items-center"
              >
                <FaPlus className="mr-2" />
                Add Movie
              </button>
            )}
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="bg-[#E50914] text-[#F5F5F5] px-4 py-2 rounded hover:bg-[#E50914]/80 transition duration-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <FaSearch className="text-[#C8A951] mr-3" />
            <input
              type="text"
              placeholder="Search movies by name, genre, or language..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
            />
            <button
              onClick={() => setSearchTerm('')}
              className="ml-3 bg-[#E50914] text-[#F5F5F5] px-4 py-2 rounded hover:bg-[#E50914]/80 transition duration-300"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          {movies.map((movie) => (
            <div key={movie._id} className="bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg overflow-hidden">
              <div className="relative">
                <img
                  src={movie.imageUrl}
                  alt={movie.title || movie.name}
                  className="w-full h-64 object-cover object-center"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x400/333333/cccccc?text=No+Image';
                  }}
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 rounded px-2 py-1 flex items-center">
                  <FaStar className="text-yellow-400 mr-1" />
                  <span className="text-white text-sm">{movie.ratings}</span>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold text-[#C8A951] mb-2">{movie.title || movie.name}</h3>
                <div className="space-y-2 text-sm text-[#F5F5F5]/70">
                  <div className="flex items-center">
                    <FaTheaterMasks className="mr-2" />
                    <span>{movie.genre}</span>
                  </div>
                  <div className="flex items-center">
                    <FaLanguage className="mr-2" />
                    <span>{Array.isArray(movie.language) ? movie.language.join(', ') : movie.language}</span>
                  </div>
                  <div className="flex items-center">
                    <FaClock className="mr-2" />
                    <span>{movie.duration} min</span>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center bg-[#0D0D0D] py-2 rounded">
                    <div className="text-[#C8A951] font-semibold">{movie.showtimeCount || 0}</div>
                    <div className="text-[#F5F5F5]/70">Showtimes</div>
                  </div>
                  <div className="text-center bg-[#0D0D0D] py-2 rounded">
                    <div className="text-[#C8A951] font-semibold">{movie.bookingCount || 0}</div>
                    <div className="text-[#F5F5F5]/70">Bookings</div>
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleEditMovie(movie)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-300 flex items-center justify-center"
                    title="View/Edit"
                  >
                    <FaEye className="mr-1" />
                    View
                  </button>
                  {['admin', 'manager'].includes(currentUser.role) && (
                    <>
                      <button
                        onClick={() => handleEditMovie(movie)}
                        className="bg-[#C8A951] text-[#0D0D0D] p-2 rounded hover:bg-[#DFBD69] transition duration-300"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteMovie(movie._id, movie.name)}
                        className="bg-[#E50914] text-white p-2 rounded hover:bg-[#E50914]/80 transition duration-300"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center">
          <div className="text-[#F5F5F5]/70">
            Showing {movies.length} movies
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

        {/* Movie Modal */}
        {showMovieModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#C8A951]">
                  {isEditing ? 'Edit Movie' : 'Add New Movie'}
                </h2>
                <button
                  onClick={() => setShowMovieModal(false)}
                  className="text-[#F5F5F5] hover:text-[#E50914] text-xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitMovie} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#C8A951] mb-1">
                      Movie Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C8A951] mb-1">
                      Genre
                    </label>
                    <input
                      type="text"
                      name="genre"
                      value={formData.genre}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C8A951] mb-1">
                      Language
                    </label>
                    <input
                      type="text"
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C8A951] mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C8A951] mb-1">
                      Rating
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      name="ratings"
                      value={formData.ratings}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C8A951] mb-1">
                      Votes
                    </label>
                    <input
                      type="text"
                      name="votes"
                      value={formData.votes}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C8A951] mb-1">
                    Cast
                  </label>
                  <input
                    type="text"
                    name="cast"
                    value={formData.cast}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-[#C8A951] mb-1">
                    Movie Image
                  </label>
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Movie preview"
                          className="w-32 h-48 object-cover rounded-lg border border-[#C8A951]/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                            setFormData(prev => ({...prev, imageUrl: ''}));
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition duration-200"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* File Upload */}
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none file:mr-4 file:py-1 file:px-3 file:border-0 file:text-sm file:bg-[#C8A951] file:text-[#0D0D0D] file:rounded file:cursor-pointer hover:file:bg-[#DFBD69]"
                    />
                    <p className="text-xs text-[#F5F5F5]/70">
                      Upload a movie poster (JPG, PNG, WebP, GIF - Max 5MB)
                    </p>
                  </div>
                  
                  {/* Fallback URL Input */}
                  <div className="border-t border-[#C8A951]/20 pt-3">
                    <label className="block text-xs text-[#F5F5F5]/70 mb-1">
                      Or enter image URL directly:
                    </label>
                    <input
                      type="url"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleInputChange}
                      placeholder="https://example.com/image.jpg"
                      className="w-full bg-[#0D0D0D] border border-[#C8A951]/20 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C8A951] mb-1">
                    Summary
                  </label>
                  <textarea
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    required
                    rows="4"
                    className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowMovieModal(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingImage}
                    className="bg-[#C8A951] text-[#0D0D0D] px-6 py-2 rounded hover:bg-[#DFBD69] transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {uploadingImage ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Uploading Image...
                      </>
                    ) : (
                      isEditing ? 'Update Movie' : 'Add Movie'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
