import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportItem from './pages/ReportItem';
import SearchItems from './pages/SearchItems';
import ItemDetails from './pages/ItemDetails';
import AdminDashboard from './pages/AdminDashboard';
import { ShieldCheck } from 'lucide-react';

function AppContent() {
  const { currentUser, loading } = useAuth();
  
  // Tab Routing State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [itemDetailType, setItemDetailType] = useState('lost'); // 'lost' or 'found'
  
  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark mode for rich aesthetics!
  });

  // Apply dark mode theme
  useEffect(() => {
    const bodyClass = document.body.classList;
    if (darkMode) {
      bodyClass.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      bodyClass.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors">
        <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-400 dark:text-slate-500 mt-4 font-bold tracking-wide">Loading Secure Session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Dynamic Navbar */}
      {currentUser && (
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
        />
      )}

      {/* Main Pages router */}
      <main className="flex-1">
        {!currentUser ? (
          <div className="py-12">
            <Login />
          </div>
        ) : (
          <div>
            {activeTab === 'dashboard' && (
              <Dashboard 
                setActiveTab={setActiveTab} 
                setSelectedItemId={setSelectedItemId} 
                setItemDetailType={setItemDetailType} 
              />
            )}
            {activeTab === 'report' && (
              <ReportItem setActiveTab={setActiveTab} />
            )}
            {activeTab === 'search' && (
              <SearchItems 
                setSelectedItemId={setSelectedItemId} 
                setItemDetailType={setItemDetailType} 
                setActiveTab={setActiveTab} 
              />
            )}
            {activeTab === 'admin' && currentUser.role === 'admin' && (
              <AdminDashboard />
            )}
            {activeTab === 'details' && (
              <ItemDetails 
                itemId={selectedItemId} 
                itemType={itemDetailType} 
                setActiveTab={setActiveTab} 
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/50 dark:border-slate-800/50 text-center text-xs text-slate-450 dark:text-slate-500 mt-12 bg-white/40 dark:bg-slate-950/20 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-semibold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-primary-500" />
            Smart Lost and Found System © {new Date().getFullYear()} College Campus Portal.
          </p>
          <p className="text-slate-400 italic">Built for graduation major project verification.</p>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
