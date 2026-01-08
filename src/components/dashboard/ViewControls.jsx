import React from 'react';
import { Plus, Minus, Navigation, RotateCw } from 'lucide-react';

export default function ViewControls({ activeView, onViewChange, onZoom }) {
  const views = [
    { id: 'live', label: 'LIVE STREAM', hasIndicator: true },
    { id: 'model', label: 'Model View' },
    { id: 'thermal', label: 'Thermal' },
    { id: 'stress', label: 'Stress' }
  ];

  return (
    <>
      {/* Bottom Left - View Tabs */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm rounded-lg p-1 border border-slate-700/50">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeView === view.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {view.hasIndicator && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
            {view.label}
          </button>
        ))}
      </div>
      
      {/* Bottom Right - Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button 
          onClick={() => onZoom('in')}
          className="w-9 h-9 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onZoom('out')}
          className="w-9 h-9 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onZoom('reset')}
          className="w-9 h-9 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          title="Reset view"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}