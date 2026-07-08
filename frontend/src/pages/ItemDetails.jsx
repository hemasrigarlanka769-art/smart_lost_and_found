import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  MapPin, Calendar, Folder, Phone, CheckCircle, 
  Sparkles, ShieldCheck, ArrowLeft, Camera, AlertCircle
} from 'lucide-react';

export default function ItemDetails({ itemId, itemType, setActiveTab }) {
  const { currentUser } = useAuth();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Claim Modal Form State
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [uniqueMarks, setUniqueMarks] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  // Target item being claimed (usually from matches suggestions list or the main found item)
  const [claimTargetItemId, setClaimTargetItemId] = useState(null);

  const fetchItemDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items/${itemType}/${itemId}`);
      if (!res.ok) throw new Error("Item not found");
      const data = await res.json();
      setItem(data);

      // If current user is the owner, load AI matches from backend
      if (data.user_id === currentUser?.id && data.status !== 'claimed') {
        const token = localStorage.getItem('auth_token');
        const matchRes = await fetch(`${API_BASE_URL}/matches/${itemType}/${itemId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          setMatches(matchData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itemId) fetchItemDetails();
  }, [itemId, itemType, currentUser]);

  const handleProofImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingProof(true);
    setClaimError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/items/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Image upload failed");
      const data = await res.json();
      setProofUrl(data.image_url);
    } catch (err) {
      setClaimError("Could not upload proof document. Please try again.");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!uniqueMarks) {
      setClaimError("Unique identifying marks are required to file a claim.");
      return;
    }

    setSubmittingClaim(true);
    setClaimError('');
    setClaimSuccess('');

    const token = localStorage.getItem('auth_token');
    
    // If we're claiming the item directly, found_item_id is claimTargetItemId.
    // If it's a lost item matching, lost_item_id is item.id.
    const claimPayload = {
      found_item_id: claimTargetItemId,
      lost_item_id: itemType === 'lost' ? item.id : null,
      unique_marks: uniqueMarks,
      purchase_date: purchaseDate || null,
      proof_url: proofUrl || null
    };

    try {
      const res = await fetch(`${API_BASE_URL}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(claimPayload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to submit claim");
      }

      setClaimSuccess("Claim successfully filed! Administrators have been notified to review your verification proofs.");
      setUniqueMarks('');
      setPurchaseDate('');
      setProofUrl('');
      
      setTimeout(() => {
        setClaimModalOpen(false);
        setActiveTab('dashboard');
      }, 2500);

    } catch (err) {
      setClaimError(err.message || "An error occurred filing the claim.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleRejectMatch = async (matchId) => {
    if (!window.confirm("Ignore this suggested match?")) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/matches/${matchId}/status?status_update=rejected`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMatches(prev => prev.filter(m => m.id !== matchId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 flex flex-col items-center justify-center">
        <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-slate-400 mt-4 font-semibold">Loading item details...</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-red-500 font-bold">Item not found or has been deleted.</p>
        <button onClick={() => setActiveTab('search')} className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg">
          Back to Catalog
        </button>
      </div>
    );
  }

  const isLost = itemType === 'lost';
  const imgSource = item.image_url;
  const formattedImg = imgSource 
    ? (imgSource.startsWith('/static') ? `${API_BASE_URL}${imgSource}` : imgSource)
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      
      {/* Back navigation */}
      <button 
        onClick={() => setActiveTab('search')}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold mb-6 group transition-colors"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Catalog
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Main Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-lg">
            
            {/* Image Banner */}
            <div className="relative w-full aspect-[2/1] bg-slate-150 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-200/50 dark:border-slate-800/50">
              {formattedImg ? (
                <img src={formattedImg} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-300 dark:text-slate-700 font-bold uppercase tracking-wider text-sm">No photo available</span>
              )}
              <span className={`absolute top-4 left-4 px-3 py-1 rounded-xl text-xs font-black uppercase shadow ${
                isLost ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {isLost ? 'Lost Item' : 'Found Item'}
              </span>
            </div>

            {/* Content Details */}
            <div className="p-6 sm:p-8 space-y-6">
              
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{item.name}</h1>
                  <div className="flex flex-wrap gap-y-1.5 gap-x-4 mt-2.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Folder className="w-4 h-4 text-slate-400" /> {item.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-slate-400" /> {isLost ? item.location_lost : item.location_found}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" /> 
                      {new Date(isLost ? item.date_lost : item.date_found).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Claim Button for active Found reports */}
                {!isLost && item.status === 'found' && item.user_id !== currentUser?.id && (
                  <button
                    onClick={() => {
                      setClaimTargetItemId(item.id);
                      setClaimModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-primary-500/25 active:scale-95 transition-transform"
                  >
                    Claim This Item
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Item Description</h3>
                <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>

              {/* Contact Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/80 space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Contact Details
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{item.contact_info}</p>
              </div>

            </div>

          </div>
        </div>

        {/* Right 1 Column: AI suggestions (Visible only if current user is owner) */}
        <div className="lg:col-span-1">
          {item.user_id === currentUser?.id && (
            <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-md space-y-4">
              <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse-slow" />
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">AI Match suggestions</h3>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  No matches discovered yet. We will notify you once a similar item is reported.
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map(m => {
                    const matchItem = isLost ? m.found_item : m.lost_item;
                    if (!matchItem) return null;
                    const confidence = m.overall_score >= 80 ? 'High Confidence' : m.overall_score >= 60 ? 'Moderate' : 'Low Confidence';
                    const badgeColor = m.overall_score >= 80 ? 'bg-emerald-500' : m.overall_score >= 60 ? 'bg-indigo-500' : 'bg-slate-400';

                    return (
                      <div 
                        key={m.id} 
                        className="p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-slate-700 dark:text-slate-200 truncate w-32">{matchItem.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black text-white ${badgeColor}`}>
                            {m.overall_score}%
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">{matchItem.description}</p>
                        
                        {/* Similiarity breakdowns */}
                        <div className="grid grid-cols-3 gap-1 py-1 text-[8px] text-slate-400 border-y border-slate-100 dark:border-slate-800 my-0.5 text-center">
                          <div>
                            <p className="font-bold">{m.keyword_score}%</p>
                            <p>Keyword</p>
                          </div>
                          <div>
                            <p className="font-bold">{m.text_score}%</p>
                            <p>Semantic</p>
                          </div>
                          <div>
                            <p className="font-bold">{m.image_score > 0 ? `${m.image_score}%` : 'N/A'}</p>
                            <p>Visual</p>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-1">
                          <button
                            onClick={() => handleRejectMatch(m.id)}
                            className="px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold border border-slate-200 dark:border-slate-800 rounded-lg"
                          >
                            Ignore
                          </button>
                          {isLost && (
                            <button
                              onClick={() => {
                                setClaimTargetItemId(m.found_item_id);
                                setClaimModalOpen(true);
                              }}
                              className="px-3 py-1 text-[10px] bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-bold rounded-lg shadow-sm"
                            >
                              Claim Item
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* CLAIM SUBMISSION MODAL */}
      {claimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative animate-slide-up">
            
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary-500" />
                Claim Verification Proofs
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Provide identifying details. Administrators will inspect these details to authorize collection.
              </p>
            </div>

            {claimError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-800/40 text-xs text-rose-600 dark:text-rose-400 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{claimError}</span>
              </div>
            )}

            {claimSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/40 text-xs text-emerald-600 dark:text-emerald-400 flex gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{claimSuccess}</span>
              </div>
            )}

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                  Unique Identifying Marks *
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Red flower sticker on case, serial number SN-1234, deep scratch near ports, specific wallpapers..."
                  value={uniqueMarks}
                  onChange={(e) => setUniqueMarks(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Approximate Purchase Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. October 2025"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Upload Additional Proof
                  </label>
                  <div className="relative border border-dashed border-slate-200 dark:border-slate-850 rounded-xl p-2 flex items-center justify-center bg-slate-50 dark:bg-slate-950/20 text-xs">
                    {proofUrl ? (
                      <span className="text-[10px] text-emerald-500 font-bold truncate">File Uploaded successfully!</span>
                    ) : (
                      <label className="cursor-pointer flex items-center gap-1.5 justify-center py-1">
                        {uploadingProof ? (
                          <div className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 text-slate-400" />
                            <span className="font-bold text-slate-500">Pick image (receipt/photo)</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleProofImageUpload} disabled={uploadingProof} />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setClaimModalOpen(false)}
                  className="flex-1 py-3 text-xs font-extrabold text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim || uploadingProof}
                  className="flex-1 py-3 text-xs font-extrabold bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-md active:scale-[0.98]"
                >
                  {submittingClaim ? "Submitting Claim..." : "Submit Claim request"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
