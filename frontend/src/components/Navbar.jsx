import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  Bell, Sun, Moon, LogOut, User as UserIcon, 
  Menu, X, Search, ShieldAlert, FilePlus, Home
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, darkMode, setDarkMode }) {
  const { currentUser, logout, devSwitchRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (!currentUser) return;
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE_URL}/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
    // Poll notifications every 10 seconds for simulated real-time updates
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass shadow-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div 
              onClick={() => handleTabClick('dashboard')} 
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300">
                <span className="font-extrabold text-xl tracking-tight">S</span>
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent dark:from-primary-400 dark:to-indigo-300 hidden sm:block">
                Smart Finder
              </span>
            </div>

            {/* Navigation links (Desktop) */}
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              <button
                onClick={() => handleTabClick('dashboard')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'dashboard'
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Home className="w-4 h-4 mr-1.5" /> Dashboard
              </button>
              <button
                onClick={() => handleTabClick('report')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'report'
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <FilePlus className="w-4 h-4 mr-1.5" /> Report Item
              </button>
              <button
                onClick={() => handleTabClick('search')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'search'
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Search className="w-4 h-4 mr-1.5" /> Search Catalog
              </button>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => handleTabClick('admin')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'admin'
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/30'
                      : 'text-slate-600 dark:text-slate-300 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 mr-1.5" /> Administration
                </button>
              )}
            </div>
          </div>

          {/* Action buttons (Right) */}
          <div className="flex items-center gap-2">


            {/* Dark Mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  setDropdownOpen(false);
                }}
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Menu */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 glass border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 text-sm overflow-hidden animate-slide-up">
                  <div className="flex justify-between items-center px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead}
                        className="text-xs text-primary-500 hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-500 font-medium">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(notif => (
                        <div 
                          key={notif.id}
                          className={`p-3 rounded-lg mb-1 transition-colors ${
                            notif.is_read ? 'opacity-70' : 'bg-primary-50/30 dark:bg-primary-950/10 border-l-2 border-primary-500'
                          }`}
                        >
                          <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{notif.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 text-center">
                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        // Notify the Dashboard page to switch to Notifications tab
                        window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'notifications' }));
                        setNotifDropdownOpen(false);
                      }}
                      className="text-xs text-primary-500 hover:underline font-bold"
                    >
                      View all in Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setNotifDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-primary-500/10">
                  {currentUser?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 glass border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 text-slate-700 dark:text-slate-200 animate-slide-up">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="font-bold text-sm truncate">{currentUser?.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{currentUser?.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 text-[10px] font-extrabold rounded uppercase tracking-wider">
                      {currentUser?.role}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleTabClick('dashboard');
                      window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'profile' }));
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" /> View Profile
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-slate-200/50 dark:border-slate-800/50 p-2 space-y-1 animate-slide-up">
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              activeTab === 'dashboard' ? 'bg-primary-500 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => handleTabClick('report')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              activeTab === 'report' ? 'bg-primary-500 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FilePlus className="w-4 h-4" /> Report Item
          </button>
          <button
            onClick={() => handleTabClick('search')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              activeTab === 'search' ? 'bg-primary-500 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" /> Search Catalog
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => handleTabClick('admin')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'admin' ? 'bg-primary-500 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" /> Administration
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
