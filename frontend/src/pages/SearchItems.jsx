import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Search, MapPin, Calendar, Folder, Info, Eye } from 'lucide-react';
import CampusMap from '../components/CampusMap';

export default function SearchItems({ setSelectedItemId, setItemDetailType, setActiveTab }) {
  const [itemsList, setItemsList] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'lost', 'found'
  const [searchKeyword, setSearchKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let lostData = [];
      let foundData = [];
      
      // If user wants Lost or All
      if (filterType === 'all' || filterType === 'lost') {
        const queryParams = new URLSearchParams();
        if (category) queryParams.append('category', category);
        if (location) queryParams.append('location', location);
        if (searchKeyword) queryParams.append('keyword', searchKeyword);
        queryParams.append('status', 'lost');
        
        const res = await fetch(`${API_BASE_URL}/items/lost?${queryParams.toString()}`);
        if (res.ok) lostData = await res.json();
      }

      // If user wants Found or All
      if (filterType === 'all' || filterType === 'found') {
        const queryParams = new URLSearchParams();
        if (category) queryParams.append('category', category);
        if (location) queryParams.append('location', location);
        if (searchKeyword) queryParams.append('keyword', searchKeyword);
        queryParams.append('status', 'found');
        
        const res = await fetch(`${API_BASE_URL}/items/found?${queryParams.toString()}`);
        if (res.ok) foundData = await res.json();
      }

      // Combine and sort
      const combined = [...lostData, ...foundData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setItemsList(combined);
    } catch (err) {
      console.error("Error searching items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filterType, category, location]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchItems();
  };

  const viewDetails = (item) => {
    const type = item.hasOwnProperty('location_lost') ? 'lost' : 'found';
    setSelectedItemId(item.id);
    setItemDetailType(type);
    setActiveTab('details');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Smart Search Catalog</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Explore all active lost and found items. Click details to initiate a claim.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Filter Form & Item List */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Search Box & Filters */}
          <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-md">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              
              {/* Keyword Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search keywords: 'Lenovo', 'red bottle', 'blue binder'..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/10 transition-transform active:scale-95"
                >
                  Search
                </button>
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Type toggle */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Item Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-primary-500"
                  >
                    <option value="all">All Items</option>
                    <option value="lost">Lost Reports</option>
                    <option value="found">Found Reports</option>
                  </select>
                </div>

                {/* Category select */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-primary-500"
                  >
                    <option value="">All Categories</option>
                    {['Electronics', 'Personal Belongings', 'Books & Stationery', 'Clothing', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Campus Location select */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Campus Zone</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-primary-500"
                  >
                    <option value="">All Zones</option>
                    {["Main Library", "Science Block", "Gymnasium", "Administration", "Central Canteen", "College Lawn"].map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

              </div>

            </form>
          </div>

          {/* Items List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
              <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-400 mt-4 font-semibold">Searching catalog...</span>
            </div>
          ) : itemsList.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 p-6">
              <Info className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">No results match your criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting filters or checking your keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {itemsList.map(item => {
                const isLost = item.hasOwnProperty('location_lost');
                const imgSource = item.image_url;
                const formattedImg = imgSource 
                  ? (imgSource.startsWith('/static') ? `${API_BASE_URL}${imgSource}` : imgSource)
                  : null;
                
                return (
                  <div 
                    key={`${isLost ? 'lost' : 'found'}-${item.id}`}
                    onClick={() => viewDetails(item)}
                    className="group glass rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col cursor-pointer card-hover hover:border-primary-500/50"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                      {formattedImg ? (
                        <img 
                          src={formattedImg} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-slate-300 dark:text-slate-700 font-semibold text-xs uppercase tracking-wider">No Image Provided</div>
                      )}
                      
                      <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow ${
                        isLost 
                          ? 'bg-rose-500 text-white shadow-rose-500/20' 
                          : 'bg-emerald-500 text-white shadow-emerald-500/20'
                      }`}>
                        {isLost ? 'Lost' : 'Found'}
                      </span>
                    </div>

                    {/* Card Description */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-primary-500 transition-colors">
                          {item.name}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 mt-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Folder className="w-3.5 h-3.5 text-slate-400" /> {item.category}
                          </span>
                          <span className="flex items-center gap-1 truncate w-32">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {isLost ? item.location_lost : item.location_found}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(isLost ? item.date_lost : item.date_found).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-0.5 font-extrabold text-primary-500">
                          Inspect <Eye className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Side: Map tracker */}
        <div className="lg:col-span-1">
          <div className="glass p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-md sticky top-24">
            <CampusMap 
              items={itemsList}
              readOnly={true}
              onSelectLocation={null}
              selectedLocationName={null}
              typeFilter={filterType}
            />
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-xl text-[10px] text-slate-400 space-y-2">
              <p className="font-bold text-slate-500 dark:text-slate-300">Map Legend:</p>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow shadow-rose-500"></span>
                <span>Active Lost Item Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow shadow-emerald-500"></span>
                <span>Active Found Item Reports</span>
              </div>
              <p className="text-slate-400 italic">Click on map pins to open quick tooltips containing descriptions and links.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
