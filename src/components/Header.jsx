import { useState, useRef, useEffect } from "react";
import { FiMenu, FiSearch, FiBell, FiUser, FiChevronDown, FiLogOut, FiSettings } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../context/sidebarContext";
import { clearSession } from "../utils/auth";

// Retain the optional header controls for later use.
const SHOW_HEADER_EXTRAS = false;

const Header = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-[70px] px-5 lg:px-8 bg-white border-b border-gray-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Left side: Hamburger & Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition duration-150"
        >
          <FiMenu className="text-xl" />
        </button>

        {/* Global Search Input */}
        {SHOW_HEADER_EXTRAS && <div className="relative w-full max-w-md hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <FiSearch className="text-base" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sheets, data, or anything..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#f1f5f9] text-gray-800 placeholder-gray-400 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition duration-150"
          />
        </div>}
      </div>

      {/* Right side: Notifications & User Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        {SHOW_HEADER_EXTRAS && <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
            className="relative flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition duration-150"
          >
            <FiBell className="text-xl" />
            {/* Notification Badge */}
            <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-[#ef4444] rounded-full ring-2 ring-white">
              1
            </span>
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                <span className="text-xs text-blue-600 hover:underline cursor-pointer">Mark all as read</span>
              </div>
              <div className="px-4 py-3 hover:bg-blue-50/50 transition cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">System Ready</p>
                    <p className="text-xs text-gray-500 mt-0.5">Sheets from GDP to XVII.b are loaded and ready for data upload.</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">Just now</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>}

        {/* User Profile Pill */}
        {SHOW_HEADER_EXTRAS && <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-50 border border-transparent hover:border-gray-200 transition duration-150"
          >
            <div className="w-9 h-9 rounded-full bg-[#111827] text-white flex items-center justify-center text-sm font-medium shadow-sm">
              <FiUser className="text-base" />
            </div>
            <span className="text-sm font-semibold text-gray-800 hidden sm:inline-block">Admin</span>
            <FiChevronDown className={`text-xs text-gray-500 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* User Profile Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500">Signed in as</p>
                <p className="text-sm font-bold text-gray-900 truncate">Administrator</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate("/admin/settings");
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition"
              >
                <FiSettings className="text-gray-500" />
                Settings
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition font-medium"
              >
                <FiLogOut className="text-red-500" />
                Logout
              </button>
            </div>
          )}
        </div>}
        <button type="button" onClick={handleLogout} aria-label="Logout" title="Logout"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <FiLogOut aria-hidden="true" className="text-xl" />
        </button>
      </div>
    </header>
  );
};

export default Header;
