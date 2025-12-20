import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaChartBar,
  FaDollarSign,
  FaDownload,
  FaCalendar,
  FaSpinner,
  FaFilm,
  FaTicketAlt,
  FaUsers,
  FaChartLine
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Reports() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // today
    groupBy: 'day'
  });

  const backendUrl = 
    process.env.NODE_ENV === 'production' 
      ? 'https://cinimax.onrender.com' 
      : 'http://localhost:5000';

  const COLORS = ['#C8A951', '#E50914', '#00C853', '#FF9800', '#9C27B0', '#2196F3'];

  useEffect(() => {
    if (!currentUser || !['admin', 'manager', 'staff'].includes(currentUser.role)) {
      navigate('/');
      return;
    }
    fetchRevenueReport();
  }, [currentUser, navigate, dateRange]);

  const fetchRevenueReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(dateRange);
      
      const response = await axios.get(`${backendUrl}/api/admin/reports/revenue?${params}`, {
        withCredentials: true
      });

      setRevenueData(response.data);
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      setError(error.response?.data?.message || 'Failed to fetch revenue report');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (key, value) => {
    setDateRange(prev => ({ ...prev, [key]: value }));
  };

  const downloadReport = async (format) => {
    try {
      const params = new URLSearchParams({ ...dateRange, format });
      
      const response = await axios.get(`${backendUrl}/api/admin/reports/revenue?${params}`, {
        withCredentials: true,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `revenue-report-${dateRange.startDate}-to-${dateRange.endDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const formatCurrency = (value) => `$${value.toFixed(2)}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-6xl text-[#C8A951] animate-spin mb-4" />
          <p className="text-[#F5F5F5] text-lg">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#E50914] text-lg mb-4">{error}</p>
          <button 
            onClick={fetchRevenueReport}
            className="bg-[#C8A951] text-[#0D0D0D] px-6 py-2 font-bold hover:bg-[#DFBD69] transition duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalRevenue = revenueData?.revenueData.reduce((sum, item) => sum + item.totalRevenue, 0) || 0;
  const totalBookings = revenueData?.revenueData.reduce((sum, item) => sum + item.bookingCount, 0) || 0;
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#C8A951] mb-2 flex items-center">
              <FaChartBar className="mr-3" />
              Revenue Reports
            </h1>
            <p className="text-[#F5F5F5]/70">Analyze revenue and booking trends within selected date range</p>
            <p className="text-[#F5F5F5]/50 text-sm mt-1">💡 Tip: Adjust date range below to see different time periods</p>
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
                <FaCalendar className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#C8A951] mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#C8A951] mb-1">
                Group By
              </label>
              <select
                value={dateRange.groupBy}
                onChange={(e) => handleDateRangeChange('groupBy', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#C8A951]/30 rounded p-2 text-[#F5F5F5] focus:border-[#C8A951] focus:outline-none"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => downloadReport('csv')}
                className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition duration-300 flex items-center justify-center"
                title="Download CSV"
              >
                <FaDownload className="mr-1" />
                CSV
              </button>
              <button
                onClick={() => downloadReport('pdf')}
                className="flex-1 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition duration-300 flex items-center justify-center"
                title="Download PDF"
              >
                <FaDownload className="mr-1" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#F5F5F5]/70 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-[#C8A951]">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-[#F5F5F5]/50 mt-1">
                  {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500">
                <FaDollarSign className="text-white text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#F5F5F5]/70 text-sm">Total Bookings</p>
                <p className="text-3xl font-bold text-[#C8A951]">{totalBookings}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500">
                <FaTicketAlt className="text-white text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#F5F5F5]/70 text-sm">Avg Booking Value</p>
                <p className="text-3xl font-bold text-[#C8A951]">{formatCurrency(averageBookingValue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500">
                <FaChartLine className="text-white text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        {totalBookings === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-8 rounded-lg text-center mb-8">
            <FaChartBar className="text-6xl text-[#F5F5F5]/30 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-[#F5F5F5] mb-2">No Data Available</h3>
            <p className="text-[#F5F5F5]/70 mb-4">
              No bookings found for the selected date range ({formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)})
            </p>
            <p className="text-[#F5F5F5]/50 text-sm mb-4">
              💡 Try expanding the date range or check if there are bookings in the system
            </p>
            <button
              onClick={() => {
                setDateRange(prev => ({
                  ...prev,
                  startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
                }));
              }}
              className="bg-[#C8A951] text-[#0D0D0D] px-4 py-2 rounded hover:bg-[#DFBD69] transition duration-300 mr-2"
            >
              Try Last 90 Days
            </button>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="bg-[#1A1A1A] text-[#F5F5F5] px-4 py-2 border border-[#C8A951]/30 rounded hover:bg-[#C8A951]/10 transition duration-300"
            >
              View All Bookings
            </button>
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend Chart */}
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={revenueData?.revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="_id" 
                  stroke="#F5F5F5"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#F5F5F5"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #C8A951',
                    color: '#F5F5F5'
                  }}
                  formatter={(value, name) => [
                    name === 'totalRevenue' ? formatCurrency(value) : value,
                    name === 'totalRevenue' ? 'Revenue' : 'Bookings'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke="#C8A951" 
                  strokeWidth={3}
                  name="Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="bookingCount" 
                  stroke="#E50914" 
                  strokeWidth={2}
                  name="Bookings"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Movie Revenue Chart */}
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-4">Top Movies by Revenue</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={revenueData?.movieRevenue.slice(0, 8) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="movieName" 
                  stroke="#F5F5F5"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  stroke="#F5F5F5"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #C8A951',
                    color: '#F5F5F5'
                  }}
                  formatter={(value, name) => [
                    name === 'totalRevenue' ? formatCurrency(value) : value,
                    name === 'totalRevenue' ? 'Revenue' : 'Bookings'
                  ]}
                />
                <Bar dataKey="totalRevenue" fill="#C8A951" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Movie Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-4">Revenue Distribution by Movie</h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={revenueData?.movieRevenue.slice(0, 6) || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ movieName, percent }) => `${movieName} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="totalRevenue"
                >
                  {(revenueData?.movieRevenue || []).slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #C8A951',
                    color: '#F5F5F5'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Movies Table */}
          <div className="bg-[#1A1A1A] border border-[#C8A951]/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-4">Top Performing Movies</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#C8A951]/30">
                    <th className="text-left py-2 text-[#C8A951]">Movie</th>
                    <th className="text-left py-2 text-[#C8A951]">Revenue</th>
                    <th className="text-left py-2 text-[#C8A951]">Bookings</th>
                    <th className="text-left py-2 text-[#C8A951]">Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(revenueData?.movieRevenue || []).slice(0, 10).map((movie, index) => (
                    <tr key={index} className="border-b border-[#F5F5F5]/10">
                      <td className="py-2 text-[#F5F5F5]">{movie.movieName}</td>
                      <td className="py-2 text-[#C8A951] font-semibold">
                        {formatCurrency(movie.totalRevenue)}
                      </td>
                      <td className="py-2 text-[#F5F5F5]">{movie.bookingCount}</td>
                      <td className="py-2 text-[#F5F5F5]">
                        {formatCurrency(movie.totalRevenue / movie.bookingCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
