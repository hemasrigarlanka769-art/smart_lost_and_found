import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Users, CheckSquare, Sparkles, Trash2, ShieldAlert, 
  MessageSquare, UserCheck, Activity, CheckCircle, XCircle, Info
} from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [lostList, setLostList] = useState([]);
  const [foundList, setFoundList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Review Feedback Modal States
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved'); // 'approved', 'rejected', 'info_requested'
  const [adminFeedback, setAdminFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch Analytics & logs
      const analyticRes = await fetch(`${API_BASE_URL}/admin/analytics`, { headers });
      if (analyticRes.ok) {
        const analyticData = await analyticRes.json();
        setAnalytics(analyticData);
      }

      // 2. Fetch Claims
      const claimsRes = await fetch(`${API_BASE_URL}/admin/claims`, { headers });
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        setClaims(claimsData);
      }

      // 3. Fetch Users
      const usersRes = await fetch(`${API_BASE_URL}/admin/users`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
      }

      // 4. Fetch Lost & Found Items for Spam Cleaner
      const lostRes = await fetch(`${API_BASE_URL}/items/lost`);
      if (lostRes.ok) setLostList(await lostRes.json());

      const foundRes = await fetch(`${API_BASE_URL}/items/found`);
      if (foundRes.ok) setFoundList(await foundRes.json());

    } catch (err) {
      console.error("Error fetching administrative data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const handleRecalculateAI = async () => {
    setRecalculating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/matches/recalculate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        // Add log internally or fetch again
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSpam = async (itemId, type) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${type} item as SPAM?`)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/spam/${type}/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (type === 'lost') setLostList(prev => prev.filter(i => i.id !== itemId));
        else setFoundList(prev => prev.filter(i => i.id !== itemId));
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openReviewModal = (claim, status) => {
    setSelectedClaim(claim);
    setReviewStatus(status);
    setAdminFeedback('');
    setActionModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/claims/${selectedClaim.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: reviewStatus,
          admin_feedback: adminFeedback
        })
      });

      if (res.ok) {
        const updatedClaim = await res.json();
        setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));
        setActionModalOpen(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 flex flex-col items-center justify-center">
        <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-slate-400 mt-4 font-semibold">Loading admin panels...</span>
      </div>
    );
  }

  // Categories count calculations for charts
  const categoryData = ['Electronics', 'Personal Belongings', 'Books & Stationery', 'Clothing', 'Other'].map(cat => {
    const lostCount = lostList.filter(i => i.category === cat).length;
    const foundCount = foundList.filter(i => i.category === cat).length;
    return { name: cat, Lost: lostCount, Found: foundCount };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary-500 animate-pulse-slow" />
            Administration Control Room
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Monitor college lost & found telemetry, verify claims, adjust roles, and manage spam.
          </p>
        </div>

        {/* Global actions */}
        <button
          onClick={handleRecalculateAI}
          disabled={recalculating}
          className="px-4.5 py-2.5 bg-gradient-to-r from-indigo-600 to-primary-600 text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
          {recalculating ? "Running AI Scorer..." : "Recalculate AI Matches"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800/80 mb-6 gap-1 overflow-x-auto pb-1">
        {[
          { id: 'analytics', label: 'Analytics & Logs', icon: Activity },
          { id: 'claims', label: 'Claim Requests', icon: CheckSquare, count: claims.filter(c => c.status === 'pending').length },
          { id: 'users', label: 'User Roles', icon: Users },
          { id: 'spam', label: 'Spam Cleaner', icon: Trash2 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 rounded-t-lg transition-all shrink-0 ${
                isActive 
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 font-extrabold'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-650'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] font-black">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        
        {/* Analytics & Logs Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Lost Reported', value: analytics?.total_lost, color: 'text-rose-500' },
                { label: 'Total Found Reported', value: analytics?.total_found, color: 'text-emerald-500' },
                { label: 'Campus Recovery Rate', value: `${analytics?.recovery_rate || 0}%`, color: 'text-primary-500' },
                { label: 'Registered Members', value: analytics?.active_users, color: 'text-indigo-500' },
              ].map((stat, i) => (
                <div key={i} className="glass p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">{stat.label}</span>
                  <span className={`text-2xl font-black mt-2 ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Category distribution */}
              <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-4">Category Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                      <Bar dataKey="Lost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Found" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Activity Logs feed */}
              <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-slate-400" /> Recent Audit Activity
                  </h3>
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {analytics?.recent_activity?.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs">No admin activities logged yet.</div>
                    ) : (
                      analytics?.recent_activity?.map(log => (
                        <div key={log.id} className="text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/30 dark:border-slate-800/50">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                            <span className="font-extrabold uppercase text-primary-500">{log.action.replace('_', ' ')}</span>
                            <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-350">{log.details}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">Operator ID: {log.admin_id}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Claim Requests Tab */}
        {activeTab === 'claims' && (
          <div className="glass rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="p-4">Claim ID</th>
                    <th className="p-4">Item Details</th>
                    <th className="p-4">Claimant Info</th>
                    <th className="p-4">Verification Proofs</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">No claim submissions available to audit.</td>
                    </tr>
                  ) : (
                    claims.map(claim => (
                      <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="p-4 font-bold text-slate-400">#{claim.id}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{claim.found_item?.name || `Found Item #${claim.found_item_id}`}</p>
                          <p className="text-[10px] text-slate-400 italic">{claim.found_item?.location_found}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-700 dark:text-slate-200">UID: {claim.claimer_id}</p>
                          <p className="text-[10px] text-slate-400">{new Date(claim.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="p-4 space-y-1 max-w-xs">
                          <p className="font-medium text-slate-600 dark:text-slate-350 line-clamp-2">
                            <strong>Marks:</strong> {claim.unique_marks}
                          </p>
                          {claim.purchase_date && (
                            <p className="text-[10px] text-slate-400"><strong>Purchased:</strong> {claim.purchase_date}</p>
                          )}
                          {claim.proof_url && (
                            <a 
                              href={claim.proof_url.startsWith('/static') ? `${API_BASE_URL}${claim.proof_url}` : claim.proof_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[10px] text-primary-500 font-bold hover:underline flex items-center gap-0.5 mt-1"
                            >
                              View Uploaded Proof Document &rarr;
                            </a>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20' :
                            claim.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/20' :
                            claim.status === 'info_requested' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20' :
                            claim.status === 'resolved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20' :
                            'bg-slate-100 text-slate-650'
                          }`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {claim.status === 'pending' || claim.status === 'info_requested' ? (
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => openReviewModal(claim, 'approved')}
                                className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm"
                                title="Approve Claim"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openReviewModal(claim, 'rejected')}
                                className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-sm"
                                title="Reject Claim"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openReviewModal(claim, 'info_requested')}
                                className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm"
                                title="Request Info"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No actions</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Roles Tab */}
        {activeTab === 'users' && (
          <div className="glass rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="p-4">User UID</th>
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Current Role</th>
                    <th className="p-4 text-right">Modify Permission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {usersList.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-4 font-mono text-[10px] text-slate-450">{user.id}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{user.name}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20' :
                          user.role === 'faculty' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {user.id !== currentUser.id ? (
                          <select
                            value={user.role}
                            onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none"
                          >
                            <option value="student">Student</option>
                            <option value="faculty">Faculty/Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Self Account</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Spam Cleaner Tab */}
        {activeTab === 'spam' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Lost Items Spam Cleaner */}
            <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-extrabold text-rose-500 mb-4 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Lost Items Spam Cleaner
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
                {lostList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">No lost items in database.</div>
                ) : (
                  lostList.map(item => (
                    <div key={item.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/80 flex justify-between items-center gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-455 mt-0.5">Category: {item.category} • Location: {item.location_lost}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Reporter UID: {item.user_id}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteSpam(item.id, 'lost')}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-xl border border-red-200/30"
                        title="Delete Spam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Found Items Spam Cleaner */}
            <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-extrabold text-emerald-500 mb-4 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Found Items Spam Cleaner
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
                {foundList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">No found items in database.</div>
                ) : (
                  foundList.map(item => (
                    <div key={item.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/80 flex justify-between items-center gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-455 mt-0.5">Category: {item.category} • Location: {item.location_found}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Reporter UID: {item.user_id}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteSpam(item.id, 'found')}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-xl border border-red-200/30"
                        title="Delete Spam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* CLAIM AUDIT REVIEW MODAL */}
      {actionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative animate-slide-up">
            
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                Provide Auditor Comments
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                You are setting Claim ID #{selectedClaim?.id} status to <strong className="uppercase">{reviewStatus.replace('_', ' ')}</strong>.
              </p>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Auditor Remarks / Feedback *
                </label>
                <textarea
                  rows="4"
                  placeholder={
                    reviewStatus === 'approved' 
                      ? "Instructions for pickup: 'Bring your student ID to Main Gate Security desk...'"
                      : reviewStatus === 'rejected'
                        ? "State reasons: 'Uploaded purchase receipt name does not match user account...'"
                        : "Describe info needed: 'Please upload a photo of the back of the laptop showing stickers...'"
                  }
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                  required
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 py-2.5 text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-md active:scale-[0.98]"
                >
                  {submittingReview ? "Saving Audit..." : "Submit Audit Decision"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
