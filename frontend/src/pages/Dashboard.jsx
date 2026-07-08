import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  Briefcase, CheckCircle, Clock, AlertTriangle, 
  Trash2, QrCode, MessageSquare, Bell, User as UserIcon, ExternalLink
} from 'lucide-react';

export default function Dashboard({ setActiveTab, setSelectedItemId, setItemDetailType }) {
  const { currentUser, logout } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);

  // Claim Feedback Modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedFeedbackClaim, setSelectedFeedbackClaim] = useState(null);

  // Listen to custom tab navigation events from Navbar
  useEffect(() => {
    const handleSwitchTab = (e) => {
      setActiveSubTab(e.detail);
    };
    window.addEventListener('switch-dashboard-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-dashboard-tab', handleSwitchTab);
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Lost
      const lostRes = await fetch(`${API_BASE_URL}/items/lost/me`, { headers });
      const lostData = await lostRes.json();
      setLostItems(Array.isArray(lostData) ? lostData : []);

      // Fetch Found
      const foundRes = await fetch(`${API_BASE_URL}/items/found/me`, { headers });
      const foundData = await foundRes.json();
      setFoundItems(Array.isArray(foundData) ? foundData : []);

      // Fetch Claims
      const claimsRes = await fetch(`${API_BASE_URL}/claims/me`, { headers });
      const claimsData = await claimsRes.json();
      setClaims(Array.isArray(claimsData) ? claimsData : []);

      // Fetch Notifications
      const notifRes = await fetch(`${API_BASE_URL}/notifications`, { headers });
      const notifData = await notifRes.json();
      setNotifications(Array.isArray(notifData) ? notifData : []);

    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleDeleteItem = async (itemId, type) => {
    if (!window.confirm("Are you sure you want to delete this report? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/items/${type}/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (type === 'lost') setLostItems(prev => prev.filter(i => i.id !== itemId));
        else setFoundItems(prev => prev.filter(i => i.id !== itemId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE_URL}/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewQR = async (claim) => {
    setSelectedClaim(claim);
    setQrModalOpen(true);
    setQrCodeData(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/claims/${claim.id}/qr`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrCodeData(data);
      }
    } catch (err) {
      console.error("Error fetching QR code:", err);
    }
  };

  const viewItemDetails = (itemId, type) => {
    setSelectedItemId(itemId);
    setItemDetailType(type);
    setActiveTab('details');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-700 via-indigo-600 to-indigo-700 text-white p-6 sm:p-8 shadow-xl shadow-primary-500/10 mb-8 border border-white/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {currentUser?.name}!</h1>
            <p className="text-primary-100 text-sm mt-1 sm:mt-1.5 max-w-xl">
              Report lost belongings, check intelligent matches, and claim found items across campus.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('report')} 
              className="px-4 py-2 bg-white text-primary-700 hover:bg-slate-50 rounded-xl text-sm font-bold shadow-md shadow-black/10 transition-all active:scale-95"
            >
              Report New Item
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar tabs */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          {[
            { id: 'profile', label: 'My Profile', icon: UserIcon },
            { id: 'lost', label: 'My Lost Items', icon: Briefcase, count: lostItems.length },
            { id: 'found', label: 'My Found Items', icon: CheckCircle, count: foundItems.length },
            { id: 'claims', label: 'My Claim Requests', icon: Clock, count: claims.length },
            { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.filter(n => !n.is_read).length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all border ${
                  isActive 
                    ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/10' 
                    : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${isActive ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
              <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-semibold">Loading data...</span>
            </div>
          ) : (
            <div className="glass rounded-3xl border border-slate-200/50 dark:border-slate-800/50 p-6 sm:p-8 shadow-md">
              
              {/* Profile Tab */}
              {activeSubTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
                    <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {currentUser?.name?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{currentUser?.name}</h2>
                      <p className="text-sm text-slate-400 dark:text-slate-500">{currentUser?.email}</p>
                      <span className="inline-block mt-2 px-2.5 py-0.5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-xs font-bold rounded uppercase tracking-wide">
                        {currentUser?.role} Account
                      </span>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-center">
                      <p className="text-2xl font-black text-primary-600 dark:text-primary-400">{lostItems.length}</p>
                      <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Lost Reports</p>
                    </div>
                    <div className="p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-center">
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{foundItems.length}</p>
                      <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Found Reports</p>
                    </div>
                    <div className="p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-center">
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {claims.filter(c => c.status === 'resolved').length}
                      </p>
                      <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Items Recovered</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lost Items Tab */}
              {activeSubTab === 'lost' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">My Reported Lost Items</h3>
                  {lostItems.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No lost items reported yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {lostItems.map(item => (
                        <div key={item.id} className="py-4 flex justify-between items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{item.location_lost} • {new Date(item.date_lost).toLocaleDateString()}</p>
                            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              item.status === 'claimed' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30' 
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewItemDetails(item.id, 'lost')}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-primary-500 transition-colors flex items-center gap-1 text-xs font-bold"
                            >
                              Details <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, 'lost')}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Found Items Tab */}
              {activeSubTab === 'found' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">My Reported Found Items</h3>
                  {foundItems.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No found items reported yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {foundItems.map(item => (
                        <div key={item.id} className="py-4 flex justify-between items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{item.location_found} • {new Date(item.date_found).toLocaleDateString()}</p>
                            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              item.status === 'claimed' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30' 
                                : 'bg-teal-100 text-teal-700 dark:bg-teal-950/30'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewItemDetails(item.id, 'found')}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-primary-500 transition-colors flex items-center gap-1 text-xs font-bold"
                            >
                              Details <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, 'found')}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Claims Tab */}
              {activeSubTab === 'claims' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">My Claim Submissions</h3>
                  {claims.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">You haven't claimed any items yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {claims.map(claim => (
                        <div 
                          key={claim.id} 
                          className="p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">
                              Claim on {claim.found_item ? claim.found_item.name : `Item #${claim.found_item_id}`}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">Submitted: {new Date(claim.created_at).toLocaleDateString()}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30' :
                                claim.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30' :
                                claim.status === 'info_requested' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30' :
                                claim.status === 'resolved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-950/30'
                              }`}>
                                {claim.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {claim.status === 'approved' && (
                              <button
                                onClick={() => handleViewQR(claim)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 transition-transform"
                              >
                                <QrCode className="w-3.5 h-3.5" /> Get QR Pass
                              </button>
                            )}
                            {claim.admin_feedback && (
                              <button
                                onClick={() => {
                                  setSelectedFeedbackClaim(claim);
                                  setFeedbackModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> View Feedback
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeSubTab === 'notifications' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Notifications History</h3>
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">All caught up! No notifications.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`py-4 flex justify-between items-start gap-4 ${
                            notif.is_read ? 'opacity-60' : 'font-semibold'
                          }`}
                        >
                          <div>
                            <h4 className="text-sm text-slate-800 dark:text-slate-100">{notif.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{notif.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1.5 block">
                              {new Date(notif.created_at).toLocaleString()}
                            </span>
                          </div>
                          {!notif.is_read && (
                            <button
                              onClick={() => handleMarkRead(notif.id)}
                              className="px-2 py-1 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-100 transition-colors"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* QR PASS MODAL */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative animate-slide-up text-center">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Claim Collection QR Pass</h3>
            <p className="text-xs text-slate-400 mt-1">Approved Claim ID: #{selectedClaim?.id}</p>
            
            <div className="my-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              {qrCodeData ? (
                <>
                  <img src={qrCodeData.qr_image} alt="Recovery QR Code" className="w-48 h-48 rounded-xl shadow-md border border-slate-200 bg-white p-1" />
                  <span className="text-[10px] font-mono text-slate-400 mt-3 uppercase tracking-wider">{qrCodeData.token}</span>
                </>
              ) : (
                <div className="flex flex-col items-center py-12">
                  <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400 mt-3 font-semibold">Generating QR...</span>
                </div>
              )}
            </div>

            <div className="text-left space-y-2.5 text-xs text-slate-500 dark:text-slate-400 mb-6 bg-primary-50/30 dark:bg-primary-950/10 p-4 rounded-xl border border-primary-500/20">
              <p className="font-bold text-slate-700 dark:text-slate-200">How to collect your item:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Visit the <strong>Security / Handoff Desk</strong> listed in the report details.</li>
                <li>Present your student or staff college ID card.</li>
                <li>Let the officer scan this QR code to complete the verification and handoff.</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setQrModalOpen(false);
                setSelectedClaim(null);
              }}
              className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative animate-slide-up">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              Administrative Feedback
            </h3>
            <p className="text-xs text-slate-400 mt-1">Claim Reference: #{selectedFeedbackClaim?.id}</p>
            
            <div className="my-5 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800 text-sm">
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedFeedbackClaim?.admin_feedback}</p>
            </div>

            <button
              onClick={() => {
                setFeedbackModalOpen(false);
                setSelectedFeedbackClaim(null);
              }}
              className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold"
            >
              Okay, Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
