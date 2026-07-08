import React, { useState } from 'react';
import { MapPin, Navigation, ZoomIn, Info } from 'lucide-react';

// Preset locations on the campus coordinate grid (Percentage based)
export const CAMPUS_LOCATIONS = [
  { name: "Main Library", x: 30, y: 25, description: "Main library study sections and reception", color: "from-blue-500 to-indigo-600" },
  { name: "Science Block Lecture Halls", x: 70, y: 30, description: "Lecture halls A-D and labs", color: "from-emerald-500 to-teal-600" },
  { name: "Gymnasium & Sports Complex", x: 20, y: 75, description: "Locker rooms, courts, and fitness center", color: "from-amber-500 to-orange-600" },
  { name: "Administration Building", x: 50, y: 55, description: "Principal office, fee counter and registrar", color: "from-purple-500 to-pink-600" },
  { name: "Central Canteen", x: 80, y: 70, description: "Dining hall and outside seating lawns", color: "from-rose-500 to-red-600" },
  { name: "College Lawn & Plaza", x: 50, y: 20, description: "Central open green lawn and pathways", color: "from-sky-500 to-cyan-600" }
];

export default function CampusMap({ items = [], onSelectLocation, selectedLocationName, readOnly = false, typeFilter = 'all' }) {
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);

  // Group items by coordinate lookup or map them to preset buildings if coordinate info is matching
  const getItemCoordinates = (itemLocation) => {
    const loc = CAMPUS_LOCATIONS.find(l => itemLocation.toLowerCase().includes(l.name.toLowerCase()));
    if (loc) {
      // Add minor random offset so multiple items in the same building don't stack directly
      const hash = (itemLocation.length * 7) % 10 - 5; 
      return { x: loc.x + hash, y: loc.y + hash };
    }
    // Return a center default if location is completely unmapped
    return { x: 50, y: 50 };
  };

  const handleMapClick = (e) => {
    if (readOnly || !onSelectLocation) return;
    
    // Calculate click coordinates percentage relative to container size
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Find nearest building
    let nearest = CAMPUS_LOCATIONS[0];
    let minDist = 9999;
    
    CAMPUS_LOCATIONS.forEach(loc => {
      const dist = Math.sqrt(Math.pow(loc.x - x, 2) + Math.pow(loc.y - y, 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = loc;
      }
    });

    onSelectLocation(nearest.name);
  };

  // Filter items to render
  const visibleItems = items.filter(item => {
    if (item.status === 'claimed' || item.status === 'inactive') return false;
    if (typeFilter === 'lost') return item.hasOwnProperty('location_lost');
    if (typeFilter === 'found') return item.hasOwnProperty('location_found');
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-primary-500" />
          {readOnly ? "Live Campus Item Tracker Map" : "Select Location on Interactive Map"}
        </h3>
        {!readOnly && (
          <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            Click nearest zone to pin
          </span>
        )}
      </div>

      {/* SVG Campus Map Container */}
      <div 
        onClick={handleMapClick}
        className={`relative w-full aspect-[16/10] rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 select-none bg-slate-100 dark:bg-slate-950/70 ${readOnly ? 'cursor-default' : 'cursor-crosshair hover:shadow-primary-100 dark:hover:shadow-primary-950/20 transition-shadow duration-300'}`}
      >
        {/* Custom Stylized Campus Grid and Pathways */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4%_6.4%] opacity-20"></div>
        
        {/* Vector Pathways */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 dark:opacity-20" xmlns="http://www.w3.org/2000/svg">
          {/* Main Diagonal Walkways */}
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="gray" strokeWidth="6" strokeDasharray="5,10" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="gray" strokeWidth="6" strokeDasharray="5,10" />
          <circle cx="50%" cy="50%" r="80" fill="none" stroke="gray" strokeWidth="4" strokeDasharray="10,10" />
        </svg>

        {/* Render Campus Buildings Zone Circles */}
        {CAMPUS_LOCATIONS.map((building) => {
          const isSelected = selectedLocationName === building.name;
          const isHovered = hoveredBuilding === building.name;
          
          return (
            <div
              key={building.name}
              style={{ left: `${building.x}%`, top: `${building.y}%` }}
              onMouseEnter={() => setHoveredBuilding(building.name)}
              onMouseLeave={() => setHoveredBuilding(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
            >
              {/* Pulsing Zone Target */}
              <div 
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isSelected 
                    ? 'scale-110 bg-primary-500/20 border-2 border-primary-500 ring-4 ring-primary-500/10'
                    : isHovered
                      ? 'scale-105 bg-slate-200/50 dark:bg-slate-800/50 border border-slate-400 dark:border-slate-600'
                      : 'bg-slate-200/20 dark:bg-slate-800/10 border border-slate-300/30 dark:border-slate-700/20'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${building.color} shadow flex items-center justify-center text-white text-[10px] font-bold`}>
                  {building.name.split(' ').map(w => w[0]).join('')}
                </div>
              </div>
              
              {/* Zone Label */}
              <span className={`mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm pointer-events-none transition-colors duration-200 ${
                isSelected 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-white/80 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800'
              }`}>
                {building.name}
              </span>
            </div>
          );
        })}

        {/* Render dynamic Lost/Found pins only in ReadOnly mode (to view items on map) */}
        {readOnly && visibleItems.map((item) => {
          const isLost = item.hasOwnProperty('location_lost');
          const itemLocation = isLost ? item.location_lost : item.location_found;
          const coords = getItemCoordinates(itemLocation);
          const pinColor = isLost ? 'bg-rose-500 shadow-rose-500/50' : 'bg-emerald-500 shadow-emerald-500/50';
          const isSelected = selectedPin?.id === item.id && selectedPin?.isLost === isLost;

          return (
            <div
              key={`${isLost ? 'lost':'found'}-${item.id}`}
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
            >
              {/* Dynamic Pin */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(isSelected ? null : { ...item, isLost });
                }}
                className={`relative w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-125 duration-200 ${pinColor}`}
              >
                <MapPin className="w-3 h-3" />
                
                {/* Ping ring */}
                <span className={`absolute -inset-1 rounded-full animate-ping opacity-30 ${isLost ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
              </button>

              {/* Pin Tooltip Details */}
              {isSelected && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 p-2.5 rounded-xl glass border border-slate-200 dark:border-slate-800 shadow-2xl z-30 pointer-events-auto text-xs animate-slide-up">
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate w-32">{item.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${isLost ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>
                      {isLost ? 'Lost' : 'Found'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">{itemLocation}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[9px] text-slate-400">
                    <span>{new Date(isLost ? item.date_lost : item.date_found).toLocaleDateString()}</span>
                    <span className="text-primary-500 font-bold hover:underline cursor-pointer">View Details</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Building Description Footer Bar */}
      {hoveredBuilding && (
        <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 flex gap-2 items-center text-xs text-slate-500 dark:text-slate-400 animate-fade-in">
          <Info className="w-4 h-4 text-primary-500 shrink-0" />
          <div>
            <strong className="text-slate-700 dark:text-slate-200">{hoveredBuilding}: </strong>
            {CAMPUS_LOCATIONS.find(l => l.name === hoveredBuilding)?.description}
          </div>
        </div>
      )}
    </div>
  );
}
