import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaUsers,
  FaSearch,
  FaEdit,
  FaEye,
  FaUserShield,
  FaUserTimes,
  FaUserCheck,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaFilter
} from 'react-icons/fa';

export default function UserManagement() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    isActive: 'all'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userBookings, setUserBookings] = useState([]);

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  useEffect(() => {
    if (!currentUser || !['admin', 'manager', 'staff'].includes(currentUser.role)) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [currentUser, navigate, currentPage, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...filters
      });

      console.log('Fetching users with URL:', `${backendUrl}/api/admin/users?${params}`);
      console.log('Current user:', currentUser);
      console.log('Current filters:', filters);

      const response = await axios.get(`${backendUrl}/api/admin/users?${params}`, {
        withCredentials: true
      });

      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
      console.log('Successfully fetched users:', response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Enhanced error handling
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || 'Failed to fetch users';
        
        console.log('Error response data:', error.response.data);
        console.log('Error status:', statusCode);
        
        if (statusCode === 401) {
          setError('Authentication failed. Please log in again.');
          navigate('/sign-in');
        } else if (statusCode === 403) {
          setError('Access denied. Admin privileges required.');
        } else {
          setError(`Server error (${statusCode}): ${errorMessage}`);
        }
      } else if (error.request) {
        setError('Network error: Unable to connect to server. Please check if the server is running.');
      } else {
        setError('Request error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const updateUserRole = async (userId, role, isActive) => {
    try {
      await axios.put(`${backendUrl}/api/admin/users/${userId}`, 
        { role, isActive },
        { withCredentials: true }
      );
      
      fetchUsers();
      setShowUserModal(false);
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update user';
      alert(errorMessage);
      
      if (error.response?.status === 401) {
        navigate('/sign-in');
      }
    }
  };

  const viewUserDetails = async (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
    
    try {
      const response = await axios.get(
        `${backendUrl}/api/admin/users/${user._id}/bookings`,
        { withCredentials: true }
      );
      setUserBookings(response.data.bookings);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      setUserBookings([]);
      
      if (error.response?.status === 401) {
        navigate('/sign-in');
      }
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-6xl text-[#C8A951] animate-spin mb-4" />
          <p className="text-[#F5F5F5] text-lg">Loading users...</p>
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
              <FaUsers className="mr-3" />
              User Management
            </h1>
            <p className="text-[#F5F5F5]/70">Manage all registered users</p>
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
                <FaSearch className="inline mr-1" />
                Search
              </label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#C8A951] mb-1">
                <FaFilter className="inline mr-1" />
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#C8A951] mb-1">Status</label>
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ search: '', role: 'all', isActive: 'all' });
                  setCurrentPage(1);
                }}
                className="w-full bg-[#E50914] text-[#F5F5F5] px-4 py-2 rounded hover:bg-[#E50914]/80 transition duration-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-[#E50914]/10 border border-[#E50914] text-[#E50914] p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">Error loading users:</h3>
            <p>{error}</p>
            <button 
              onClick={fetchUsers}
              className="mt-2 bg-[#E50914] text-[#F5F5F5] px-4 py-2 rounded hover:bg-[#E50914]/80 transition duration-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-4 rounded-lg mb-6">
            <h3 className="text-[#C8A951] font-semibold mb-2">Debug Info:</h3>
            <p className="text-[#F5F5F5] text-sm">Current User: {currentUser?.username} (Role: {currentUser?.role})</p>
            <p className="text-[#F5F5F5] text-sm">Backend URL: {backendUrl}</p>
            <p className="text-[#F5F5F5] text-sm">Total Users Loaded: {users.length}</p>
          </div>
        )}
        <div className="bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0D0D0D] border-b border-[#C8A951]/30">
                <tr>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">User</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Email</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Role</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Status</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Joined</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Last Login</th>
                  <th className="text-left py-4 px-6 text-[#C8A951] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user._id} className="border-b border-[#F5F5F5]/10 hover:bg-[#0D0D0D]/50">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <img
                            src={user.profilePicture}
                            alt={user.username}
                            className="w-10 h-10 rounded-full mr-3"
                          />
                          <span className="text-[#F5F5F5] font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[#F5F5F5]">{user.email}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin' ? 'bg-red-500 text-white' :
                          user.role === 'manager' ? 'bg-orange-500 text-white' :
                          user.role === 'staff' ? 'bg-blue-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#F5F5F5]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-[#F5F5F5]">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewUserDetails(user)}
                            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition duration-300"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => viewUserDetails(user)}
                              className="bg-[#C8A951] text-[#0D0D0D] p-2 rounded hover:bg-[#DFBD69] transition duration-300"
                              title="Edit User"
                            >
                              <FaEdit />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <FaUsers className="text-6xl text-[#C8A951]/30 mb-4" />
                        <h3 className="text-xl font-semibold text-[#F5F5F5] mb-2">No Users Found</h3>
                        <p className="text-[#F5F5F5]/70 mb-4">
                          {filters.search || filters.role !== 'all' || filters.isActive !== 'all' 
                            ? 'No users match the current filters. Try adjusting your search criteria.'
                            : 'There are no users registered in the system yet.'
                          }
                        </p>
                        <button
                          onClick={() => {
                            setFilters({ search: '', role: 'all', isActive: 'all' });
                            setCurrentPage(1);
                          }}
                          className="bg-[#C8A951] text-[#0D0D0D] px-4 py-2 rounded hover:bg-[#DFBD69] transition duration-300"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-[#F5F5F5]/70">
            Showing {users.length} users
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

        {/* User Details Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#C8A951]">User Details</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-[#F5F5F5] hover:text-[#E50914] text-xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Info */}
                <div>
                  <h3 className="text-xl font-semibold text-[#C8A951] mb-4">User Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <img
                        src={selectedUser.profilePicture}
                        alt={selectedUser.username}
                        className="w-16 h-16 rounded-full mr-4"
                      />
                      <div>
                        <p className="text-[#F5F5F5] font-semibold">{selectedUser.username}</p>
                        <p className="text-[#F5F5F5]/70">{selectedUser.email}</p>
                      </div>
                    </div>
                    
                    {currentUser.role === 'admin' && (
                      <div className="bg-[#0D0D0D] p-4 rounded">
                        <h4 className="text-[#C8A951] font-semibold mb-3">Update User</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-[#F5F5F5] mb-1">Role</label>
                            <select
                              defaultValue={selectedUser.role}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                updateUserRole(selectedUser._id, newRole, selectedUser.isActive);
                              }}
                              className="w-full bg-[#1A1A1A] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5]"
                            >
                              <option value="user">User</option>
                              <option value="staff">Staff</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-[#F5F5F5] mb-1">Status</label>
                            <select
                              defaultValue={selectedUser.isActive.toString()}
                              onChange={(e) => {
                                const isActive = e.target.value === 'true';
                                updateUserRole(selectedUser._id, selectedUser.role, isActive);
                              }}
                              className="w-full bg-[#1A1A1A] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5]"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Bookings */}
                <div>
                  <h3 className="text-xl font-semibold text-[#C8A951] mb-4">Recent Bookings</h3>
                  <div className="max-h-96 overflow-y-auto">
                    {userBookings.length > 0 ? (
                      <div className="space-y-3">
                        {userBookings.slice(0, 5).map((booking) => (
                          <div key={booking._id} className="bg-[#0D0D0D] p-3 rounded">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[#F5F5F5] font-medium">
                                {booking.movieId?.name}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                booking.paymentStatus === 'confirmed' 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-yellow-500 text-black'
                              }`}>
                                {booking.paymentStatus}
                              </span>
                            </div>
                            <p className="text-[#F5F5F5]/70 text-sm">
                              Seats: {booking.seats?.length || 0} | Amount: ${booking.totalCost}
                            </p>
                            <p className="text-[#F5F5F5]/70 text-xs">
                              {new Date(booking.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#F5F5F5]/70">No bookings found</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
