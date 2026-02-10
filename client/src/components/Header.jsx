import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FaHome,
  FaInfoCircle,
  FaTicketAlt,
  FaQuestionCircle,
  FaBars,
  FaTimes,
  FaSignInAlt,
  FaEnvelope,
  FaUserShield,
} from "react-icons/fa";

export default function Header() {
  const { currentUser } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    setLoading(true);
    setTimeout(() => {
      navigate(path);
      setLoading(false);
    }, 1000);
    setSidebarOpen(false);
  };

  return (
    <div className="bg-white text-[#1F2933] shadow-lg shadow-[#1018280d] sticky top-0 z-50 font-[Playfair Display], serif border-b border-[#EAECF0]">
      {/* Container */}
      <div className="max-w-full px-4 md:px-6 lg:px-10 flex justify-between items-center py-4">
        {/* Brand Logo */}
        <Link to="/" className="group">
          <h1 className="text-2xl md:text-3xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-[#C8A951] via-[#DFBD69] to-[#9E7E38] tracking-[0.25em] hover:scale-105 hover:cursor-pointer transition-transform duration-300" 
              style={{
                textShadow: '0 0 10px rgba(200, 169, 81, 0.4), 0 0 3px rgba(255, 255, 255, 0.1)',
                letterSpacing: '0.08em'
              }}>
             CiniMax
          </h1>
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-2xl focus:outline-none text-[#C8A951] transition-all duration-300 hover:scale-105"
        >
          {sidebarOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex flex-grow justify-evenly items-center text-[#1F2933]">
          {[
            { name: "Home", icon: <FaHome />, path: "/" },
            { name: "About", icon: <FaInfoCircle />, path: "/about" },
            { name: "Contact", icon: <FaEnvelope />, path: "/contact" },
            { name: "FAQ", icon: <FaQuestionCircle />, path: "/faq" },
          ].map(({ name, icon, path }) => (
            <li
              key={name}
              onClick={() => handleNavigation(path)}
              className="flex items-center gap-2 text-lg font-medium transition-all duration-300 cursor-pointer px-3 py-2 hover:text-[#C8A951] border-b border-transparent hover:border-[#C8A951] group"
            >
              <span className="text-xl text-[#C8A951] group-hover:text-[#E50914] transition-all duration-300">
                {icon}
              </span>
              {name}
            </li>
          ))}

          {/* Admin Panel Link (only for admin users) */}
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'staff') && (
            <li
              onClick={() => handleNavigation("/admin/dashboard")}
              className="flex items-center gap-2 text-lg font-medium transition-all duration-300 cursor-pointer px-3 py-2 hover:text-[#C8A951] border-b border-transparent hover:border-[#C8A951] group"
            >
              <span className="text-xl text-[#C8A951] group-hover:text-[#E50914] transition-all duration-300">
                <FaUserShield />
              </span>
              Admin
            </li>
          )}

          {/* Profile or Sign In */}
          <Link
            to={currentUser ? "/profile" : "/sign-in"}
            className="transition-all duration-300 hover:scale-105"
          >
            {currentUser ? (
              <img
                src={currentUser.profilePicture}
                alt="profile"
                className="h-10 w-10 border-2 border-[#C8A951] shadow-md hover:shadow-[#C8A951]/30 transition-all duration-300"
                style={{boxShadow: '0 0 10px rgba(200, 169, 81, 0.3)'}}
              />
            ) : (
              <div className="flex items-center gap-2 text-lg font-medium transition-all duration-300 cursor-pointer px-3 py-2 hover:text-[#C8A951] border-b border-transparent hover:border-[#C8A951]">
                <FaSignInAlt className="text-xl text-[#C8A951]" />
                Sign In
              </div>
            )}
          </Link>
        </ul>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed top-0 left-0 w-72 h-full bg-gradient-to-b from-white to-[#f5f6fb] z-50 transform transition-transform duration-300 md:hidden shadow-2xl">
            <div className="p-6">
              {/* Close Button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-2xl text-[#C8A951] hover:text-[#E50914] transition-colors duration-300"
              >
                <FaTimes />
              </button>

              {/* Brand */}
              <h2 className="text-2xl font-bold text-[#C8A951] mb-8 font-cinzel tracking-[0.2em]">
                CiniMax
              </h2>

              {/* Navigation Links */}
              <ul className="space-y-2">
                {[
                  { name: "Home", icon: <FaHome />, path: "/" },
                  { name: "About", icon: <FaInfoCircle />, path: "/about" },
                  { name: "Contact", icon: <FaEnvelope />, path: "/contact" },
                  { name: "FAQ", icon: <FaQuestionCircle />, path: "/faq" },
                ].map(({ name, icon, path }) => (
                  <li
                    key={name}
                    onClick={() => handleNavigation(path)}
                    className="flex items-center gap-3 text-[#1F2933] font-medium px-3 py-2 hover:bg-[#F5F6FB] hover:text-[#C8A951] border-l-2 border-transparent hover:border-[#C8A951] transition-all duration-300 cursor-pointer rounded-lg"
                  >
                    <span className="text-xl text-[#C8A951]">{icon}</span>
                    {name}
                  </li>
                ))}

                {/* Admin Panel Link (mobile) */}
                {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'staff') && (
                  <li
                    onClick={() => handleNavigation("/admin/dashboard")}
                    className="flex items-center gap-3 text-[#1F2933] font-medium px-3 py-2 hover:bg-[#F5F6FB] hover:text-[#C8A951] border-l-2 border-transparent hover:border-[#C8A951] transition-all duration-300 rounded-lg"
                  >
                    <span className="text-xl text-[#C8A951]"><FaUserShield /></span>
                    Admin Panel
                  </li>
                )}

                {/* Profile or Sign In */}
                <li
                  onClick={() =>
                    currentUser
                      ? handleNavigation("/profile")
                      : handleNavigation("/sign-in")
                  }
                  className="flex items-center gap-3 text-[#1F2933] font-medium px-3 py-2 hover:bg-[#F5F6FB] hover:text-[#C8A951] border-l-2 border-transparent hover:border-[#C8A951] transition-all duration-300 cursor-pointer mt-4 rounded-lg"
                >
                  {currentUser ? (
                    <>
                      <img
                        src={currentUser.profilePicture}
                        alt="profile"
                        className="h-10 w-10 border-2 border-[#C8A951]"
                        style={{boxShadow: '0 0 10px rgba(200, 169, 81, 0.3)'}}
                      />
                      <span>Profile</span>
                    </>
                  ) : (
                    <>
                      <FaSignInAlt className="text-xl text-[#C8A951]" />
                      <span>Sign In</span>
                    </>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Decorative Gradient Line */}
      <div className="h-0.5 bg-gradient-to-r from-[#C8A951] via-[#E50914] to-[#C8A951] animate-slide-right" style={{boxShadow: '0 0 5px rgba(200, 169, 81, 0.5)'}} />

      {/* Loading Screen */}
      {loading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/95 z-50">
          <div className="flex items-center space-x-4 mb-4 animate-bounce">
            <FaTicketAlt className="text-4xl md:text-6xl text-[#C8A951]" style={{filter: 'drop-shadow(0 0 8px rgba(200, 169, 81, 0.5))'}} />
            <h1 className="text-2xl md:text-3xl font-[Cinzel], serif text-[#1F2933] tracking-[0.3em]" style={{textShadow: '0 0 10px rgba(200, 169, 81, 0.15)'}}>
              CiniMax
            </h1>
          </div>
          <div className="text-center text-lg font-medium text-[#1F2933] mt-8 font-[Poppins], sans-serif">
            Preparing your premium experience...
          </div>
          <div className="w-32 h-1 mt-6 bg-white overflow-hidden border border-[#C8A951]">
            <div className="h-full bg-gradient-to-r from-[#C8A951] to-[#E50914] animate-loading" style={{boxShadow: '0 0 8px rgba(200, 169, 81, 0.5)'}} />
          </div>
        </div>
      )}
    </div>
  );
}
