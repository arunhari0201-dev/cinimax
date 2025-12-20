import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  FaTachometerAlt,
  FaUsers,
  FaFilm,
  FaTicketAlt,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaHome,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import { useState } from 'react';

export default function AdminLayout({ children }) {
  const { currentUser } = useSelector((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if user has admin access
    if (!currentUser || !['admin', 'manager', 'staff'].includes(currentUser.role)) {
      navigate('/');
      return;
    }
  }, [currentUser, navigate]);

  const menuItems = [
    {
      path: '/admin/dashboard',
      name: 'Dashboard',
      icon: FaTachometerAlt,
      roles: ['admin', 'manager', 'staff']
    },
    {
      path: '/admin/users',
      name: 'Users',
      icon: FaUsers,
      roles: ['admin', 'manager', 'staff']
    },
    {
      path: '/admin/movies',
      name: 'Movies',
      icon: FaFilm,
      roles: ['admin', 'manager', 'staff']
    },
    {
      path: '/admin/bookings',
      name: 'Bookings',
      icon: FaTicketAlt,
      roles: ['admin', 'manager', 'staff']
    },
    {
      path: '/admin/showtimes',
      name: 'Showtimes',
      icon: FaTicketAlt,
      roles: ['admin', 'manager']
    },
    {
      path: '/admin/movieshowtimes',
      name: 'Movie Showtimes',
      icon: FaFilm,
      roles: ['admin', 'manager']
    },
    {
      path: '/admin/reports',
      name: 'Reports',
      icon: FaChartBar,
      roles: ['admin', 'manager', 'staff']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(currentUser?.role)
  );

  if (!currentUser || !['admin', 'manager', 'staff'].includes(currentUser.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1A1A1A] border-r border-[#C8A951]/30 transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#C8A951]/30">
            <h1 className="text-xl font-bold text-[#C8A951]">Admin Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#F5F5F5] hover:text-[#C8A951] transition duration-300"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6">
            <div className="space-y-2 px-4">
              {filteredMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg transition duration-300 ${
                      isActive
                        ? 'bg-[#C8A951] text-[#0D0D0D] shadow-lg'
                        : 'text-[#F5F5F5] hover:bg-[#C8A951]/20 hover:text-[#C8A951]'
                    }`}
                  >
                    <item.icon className="mr-3 text-lg" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-[#C8A951]/30">
            <div className="flex items-center mb-4">
              <img
                src={currentUser.profilePicture}
                alt={currentUser.username}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div>
                <p className="text-[#F5F5F5] font-medium text-sm">{currentUser.username}</p>
                <p className="text-[#C8A951] text-xs capitalize">{currentUser.role}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Link
                to="/"
                className="flex items-center px-4 py-2 rounded-lg text-[#F5F5F5] hover:bg-[#C8A951]/20 hover:text-[#C8A951] transition duration-300"
              >
                <FaHome className="mr-3" />
                <span className="text-sm">Back to Site</span>
              </Link>
              
              <button
                onClick={async () => {
                  try {
                    await fetch(`${process.env.NODE_ENV === 'production' 
                      ? 'https://cinimax.onrender.com' 
                      : 'http://localhost:5000'}/api/auth/signout`, {
                      credentials: 'include'
                    });
                    navigate('/sign-in');
                  } catch (error) {
                    console.error('Logout error:', error);
                  }
                }}
                className="flex items-center px-4 py-2 rounded-lg text-[#E50914] hover:bg-[#E50914]/20 transition duration-300 w-full"
              >
                <FaSignOutAlt className="mr-3" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-[#1A1A1A] border-b border-[#C8A951]/30 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-[#F5F5F5] hover:text-[#C8A951] transition duration-300"
            >
              <FaBars className="text-xl" />
            </button>
            <h1 className="text-lg font-bold text-[#C8A951]">Admin Panel</h1>
            <div className="w-6"></div> {/* Spacer */}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
