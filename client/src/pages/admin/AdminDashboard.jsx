import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { signOut } from '../../redux/user/userSlice';
import { validateAuthStatus } from '../../utils/authValidation';
import {
  FaUsers,
  FaFilm,
  FaTicketAlt,
  FaDollarSign,
  FaCalendar,
  FaCar,
  FaChair,
  FaEye,
  FaSpinner,
  FaExclamationTriangle
} from 'react-icons/fa';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

export default function AdminDashboard() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  useEffect(() => {
    // Check if user has admin access
    if (!currentUser || !['admin', 'manager', 'staff'].includes(currentUser.role)) {
      navigate('/');
      return;
    }
    
    // Validate authentication before fetching data
    validateAuthAndFetchData();
  }, [currentUser, navigate]);

  const validateAuthAndFetchData = async () => {
    try {
      setLoading(true);
      
      // First validate if the session is still valid
      console.log('� Validating authentication status...');
      const authStatus = await validateAuthStatus();
      
      if (!authStatus.valid) {
        console.log('❌ Authentication invalid, signing out');
        dispatch(signOut());
        navigate('/sign-in');
        return;
      }
      
      console.log('✅ Authentication valid, fetching dashboard data');
      await fetchDashboardData();
    } catch (error) {
      console.error('❌ Auth validation error:', error);
      dispatch(signOut());
      navigate('/sign-in');
    }
  };

  const fetchDashboardData = async () => {
    try {
      console.log('�📊 Fetching dashboard data from:', `${backendUrl}/api/admin/dashboard`);
      console.log('👤 Current user:', currentUser);
      console.log('🍪 Document cookies:', document.cookie);
      
      const response = await axios.get(`${backendUrl}/api/admin/dashboard`, {
        withCredentials: true
      });
      console.log('✅ Dashboard data received:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('📡 Error response:', error.response);
      
      if (error.response?.status === 401) {
        console.log('🚪 Unauthorized access, signing out');
        dispatch(signOut());
        navigate('/sign-in');
        return;
      }
      
      setError(error.response?.data?.message || 'Failed to fetch dashboard data');
      if (error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-6xl text-[#C8A951] animate-spin mb-4" />
          <p className="text-[#F5F5F5] text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-6xl text-[#E50914] mb-4 mx-auto" />
          <p className="text-[#F5F5F5] text-lg mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="bg-[#C8A951] text-[#0D0D0D] px-6 py-2 font-bold hover:bg-[#DFBD69] transition duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { todayStats, overallStats, recentBookings, seatOccupancy, parkingOccupancy } = dashboardData;

  const COLORS = ['#C8A951', '#E50914', '#F5F5F5', '#0D0D0D'];

  const statsCards = [
    {
      title: "Today's Bookings",
      value: todayStats.bookings,
      icon: FaTicketAlt,
      color: "bg-blue-500",
      change: "+12%"
    },
    {
      title: "Today's Revenue",
      value: `$${todayStats.revenue.toFixed(2)}`,
      icon: FaDollarSign,
      color: "bg-green-500",
      change: "+8%"
    },
    {
      title: "Active Shows",
      value: todayStats.showtimes,
      icon: FaFilm,
      color: "bg-purple-500",
      change: "+3%"
    },
    {
      title: "Active Users",
      value: todayStats.activeUsers,
      icon: FaUsers,
      color: "bg-orange-500",
      change: "+15%"
    }
  ];

  const overallStatsCards = [
    { title: "Total Users", value: overallStats.totalUsers, icon: FaUsers },
    { title: "Total Movies", value: overallStats.totalMovies, icon: FaFilm },
    { title: "Total Bookings", value: overallStats.totalBookings, icon: FaTicketAlt },
    { title: "Total Shows", value: overallStats.totalShowtimes, icon: FaCalendar }
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#C8A951] mb-2">Admin Dashboard</h1>
            <p className="text-[#F5F5F5]/70">Welcome back, {currentUser?.username}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#F5F5F5]/70">Role: {currentUser?.role}</p>
            <p className="text-sm text-[#F5F5F5]/70">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Today's Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <div key={index} className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#F5F5F5]/70 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-[#C8A951]">{stat.value}</p>
                  <p className="text-green-400 text-xs">{stat.change} from yesterday</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="text-white text-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Seat Occupancy Chart */}
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-4 flex items-center">
              <FaChair className="mr-2" />
              Today's Seat Occupancy
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seatOccupancy.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="movieName" stroke="#F5F5F5" />
                <YAxis stroke="#F5F5F5" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #C8A951',
                    color: '#F5F5F5'
                  }} 
                />
                <Bar dataKey="occupancyRate" fill="#C8A951" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Parking Occupancy Chart */}
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-4 flex items-center">
              <FaCar className="mr-2" />
              Today's Parking Occupancy
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={parkingOccupancy.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="movieName" stroke="#F5F5F5" />
                <YAxis stroke="#F5F5F5" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #C8A951',
                    color: '#F5F5F5'
                  }} 
                />
                <Bar dataKey="occupancyRate" fill="#E50914" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Stats and Recent Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Stats */}
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-4">Overall Statistics</h3>
            <div className="space-y-4">
              {overallStatsCards.map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded">
                  <div className="flex items-center">
                    <stat.icon className="text-[#C8A951] mr-3" />
                    <span className="text-[#F5F5F5]">{stat.title}</span>
                  </div>
                  <span className="text-[#C8A951] font-bold">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-4 flex items-center justify-between">
              <div className="flex items-center">
                Recent Bookings
                <span className="text-sm font-normal text-[#F5F5F5]/60 ml-2">(Last 10, All Time)</span>
              </div>
              <button 
                onClick={() => navigate('/admin/bookings')}
                className="text-sm bg-[#C8A951] text-[#0D0D0D] px-3 py-1 rounded hover:bg-[#DFBD69] transition duration-300"
              >
                <FaEye className="inline mr-1" />
                View All
              </button>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#C8A951]/30">
                    <th className="text-left py-2 text-[#C8A951]">User</th>
                    <th className="text-left py-2 text-[#C8A951]">Movie</th>
                    <th className="text-left py-2 text-[#C8A951]">Seats</th>
                    <th className="text-left py-2 text-[#C8A951]">Amount</th>
                    <th className="text-left py-2 text-[#C8A951]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.slice(0, 5).map((booking) => (
                    <tr key={booking._id} className="border-b border-[#F5F5F5]/10">
                      <td className="py-2 text-[#F5F5F5]">{booking.userId?.username}</td>
                      <td className="py-2 text-[#F5F5F5]">{booking.movieId?.name}</td>
                      <td className="py-2 text-[#F5F5F5]">{booking.seats?.length || 0}</td>
                      <td className="py-2 text-[#F5F5F5]">${booking.totalCost}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          booking.paymentStatus === 'confirmed' 
                            ? 'bg-green-500 text-white' 
                            : booking.paymentStatus === 'pending'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-red-500 text-white'
                        }`}>
                          {booking.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/admin/users')}
            className="bg-[#C8A951] text-[#0D0D0D] p-4 rounded-lg font-semibold hover:bg-[#DFBD69] transition duration-300"
          >
            <FaUsers className="mx-auto mb-2 text-xl" />
            Manage Users
          </button>
          <button 
            onClick={() => navigate('/admin/movies')}
            className="bg-[#E50914] text-[#F5F5F5] p-4 rounded-lg font-semibold hover:bg-[#E50914]/80 transition duration-300"
          >
            <FaFilm className="mx-auto mb-2 text-xl" />
            Manage Movies
          </button>
          <button 
            onClick={() => navigate('/admin/bookings')}
            className="bg-blue-600 text-[#F5F5F5] p-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
          >
            <FaTicketAlt className="mx-auto mb-2 text-xl" />
            Manage Bookings
          </button>
          <button 
            onClick={() => navigate('/admin/reports')}
            className="bg-green-600 text-[#F5F5F5] p-4 rounded-lg font-semibold hover:bg-green-700 transition duration-300"
          >
            <FaDollarSign className="mx-auto mb-2 text-xl" />
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
}
