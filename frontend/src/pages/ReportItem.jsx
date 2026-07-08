import React, { useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { FilePlus, Camera, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import CampusMap from '../components/CampusMap';

export default function ReportItem({ setActiveTab }) {
  const { currentUser } = useAuth();
  const [reportType, setReportType] = useState('lost'); // 'lost' or 'found'
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [contactInfo, setContactInfo] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Loading & UX States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    setErrorMessage('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/items/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Image upload failed");
      const data = await res.json();
      setImageUrl(data.image_url);
    } catch (err) {
      setErrorMessage("Failed to upload image. Please try again.");
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !description || !location || !date || !contactInfo) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const token = localStorage.getItem('auth_token');
    const endpoint = reportType === 'lost' ? 'lost' : 'found';
    
    // Map dates to backend datetime format
    const itemData = {
      name,
      category,
      description,
      contact_info: contactInfo,
      image_url: imageUrl || null
    };

    if (reportType === 'lost') {
      itemData.location_lost = location;
      itemData.date_lost = new Date(date).toISOString();
    } else {
      itemData.location_found = location;
      itemData.date_found = new Date(date).toISOString();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/items/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(itemData)
      });

      if (!res.ok) throw new Error("Failed to submit item report");
      
      setSuccessMessage(`Item successfully reported as ${reportType}! Our AI is searching for matching listings.`);
      
      // Reset form
      setName('');
      setDescription('');
      setLocation('');
      setContactInfo('');
      setImageUrl('');
      
      // Navigate back to dashboard after a delay
      setTimeout(() => {
        setActiveTab('dashboard');
      }, 2500);

    } catch (err) {
      setErrorMessage(err.message || "An error occurred during submission.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="glass rounded-3xl border border-slate-200/50 dark:border-slate-800/50 p-6 sm:p-8 shadow-xl">
        
        {/* Toggle Report Type */}
        <div className="flex gap-4 p-1.5 bg-slate-100 dark:bg-slate-950/60 rounded-2xl mb-8 border border-slate-200/40 dark:border-slate-850/40">
          <button
            type="button"
            onClick={() => { setReportType('lost'); setErrorMessage(''); }}
            className={`flex-1 py-3 text-sm font-extrabold rounded-xl transition-all ${
              reportType === 'lost'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            I Lost Something
          </button>
          <button
            type="button"
            onClick={() => { setReportType('found'); setErrorMessage(''); }}
            className={`flex-1 py-3 text-sm font-extrabold rounded-xl transition-all ${
              reportType === 'found'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            I Found Something
          </button>
        </div>

        {/* Headings */}
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FilePlus className={`w-5 h-5 ${reportType === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`} />
            Report {reportType === 'lost' ? 'Lost' : 'Found'} Campus Item
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Provide descriptive details to assist our AI-matching system in locating the item.
          </p>
        </div>

        {/* Notifications and Errors */}
        {errorMessage && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-800/40 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400 animate-slide-up">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/40 flex items-start gap-3 text-xs text-emerald-600 dark:text-emerald-400 animate-slide-up">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Black Lenovo ThinkPad Laptop"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  >
                    {['Electronics', 'Personal Belongings', 'Books & Stationery', 'Clothing', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                    Date {reportType === 'lost' ? 'Lost' : 'Found'} *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">Description *</label>
                <textarea
                  rows="4"
                  placeholder="Describe unique marks, stickers, case colors, scratches, or other identifying information..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors resize-none"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">Contact Details *</label>
                <input
                  type="text"
                  placeholder="e.g. Phone number, hostel room, or email..."
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  required
                />
              </div>

              {/* Image upload area */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">Upload Image</label>
                <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors duration-200">
                  {imageUrl ? (
                    <div className="relative group w-full flex flex-col items-center">
                      <img 
                        src={imageUrl.startsWith('/static') ? `${API_BASE_URL}${imageUrl}` : imageUrl} 
                        alt="Preview" 
                        className="h-32 w-auto object-cover rounded-xl border shadow" 
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-[10px] shadow"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-4 w-full">
                      {uploadingImage ? (
                        <div className="h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">Select image from file</span>
                          <span className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, JPEG</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={uploadingImage} />
                    </label>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column (Campus Map Picker) */}
            <div className="flex flex-col">
              <label className="block text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">Location Lost/Found *</label>
              <input
                type="text"
                placeholder="Click the map block or type location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors mb-4"
                required
              />
              <div className="flex-1 bg-white/20 p-2 rounded-2xl border border-slate-250/20">
                <CampusMap 
                  onSelectLocation={(locName) => setLocation(locName)} 
                  selectedLocationName={location}
                  readOnly={false}
                />
              </div>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-850">
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className={`w-full py-4 rounded-2xl font-extrabold text-sm text-white shadow-lg transition-transform active:scale-[0.98] ${
                reportType === 'lost'
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
              }`}
            >
              {submitting ? "Submitting Report..." : `Submit ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
