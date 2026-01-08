import React from 'react';
import { X, Info, Ruler, MapPin, Layers, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ComponentPropertiesPanel({ component, onClose }) {
  if (!component) return null;

  const getTypeColor = (type) => {
    const colors = {
      'Floor Beam': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Wall Stud': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Top Plate': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Roof Rafter': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Floor Joist': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'Ridge Beam': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Interior Stud': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Good': 'text-green-400',
      'Warning': 'text-yellow-400',
      'Critical': 'text-red-400'
    };
    return colors[status] || 'text-slate-400';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute top-4 right-4 w-80 bg-slate-800/95 backdrop-blur-md rounded-xl border border-slate-600/50 shadow-2xl overflow-hidden z-50"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-4 border-b border-slate-600/50">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Component Details</h3>
                <p className="text-slate-400 text-xs">{component.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${getTypeColor(component.type)}`}>
            <Info className="w-3 h-3" />
            {component.type}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Specifications */}
          <div>
            <h4 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Ruler className="w-3.5 h-3.5" />
              Specifications
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Material</span>
                <span className="text-white text-sm font-medium">{component.material}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Dimensions</span>
                <span className="text-white text-sm font-mono">{component.dimensions}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Weight</span>
                <span className="text-white text-sm font-medium">{component.weight}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Load Rating</span>
                <span className="text-white text-sm font-medium">{component.loadRating}</span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h4 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </h4>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-slate-400 text-xs block">X</span>
                  <span className="text-white text-sm font-mono">{component.position.x.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Y</span>
                  <span className="text-white text-sm font-mono">{component.position.y.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Z</span>
                  <span className="text-white text-sm font-mono">{component.position.z.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Sensors */}
          <div>
            <h4 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Status & Monitoring
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Structural Health</span>
                <span className={`text-sm font-semibold ${getStatusColor(component.status)}`}>
                  {component.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Sensors Attached</span>
                <span className="text-white text-sm font-medium">{component.sensors}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Last Inspection</span>
                <span className="text-white text-sm">{component.lastInspection}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400 text-sm">Install Date</span>
                <span className="text-white text-sm">{component.installDate}</span>
              </div>
            </div>
          </div>

          {/* Current Readings */}
          {component.readings && (
            <div>
              <h4 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">
                Current Readings
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {component.readings.map((reading, idx) => (
                  <div key={idx} className="bg-slate-700/30 rounded-lg p-2">
                    <span className="text-slate-400 text-xs block mb-1">{reading.label}</span>
                    <span className="text-white text-sm font-semibold">{reading.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-700/30 p-3 border-t border-slate-600/50">
          <p className="text-slate-400 text-xs text-center">
            Click on another component to view its details
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}