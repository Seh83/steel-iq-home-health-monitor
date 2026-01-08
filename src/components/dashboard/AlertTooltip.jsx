import React from 'react';
import { Droplets, Flame, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlertTooltip({ alert, position, onClose }) {
  if (!alert) return null;
  
  const isMoisture = alert.type === 'moisture';
  const isCritical = alert.severity === 'critical';
  
  const config = isMoisture ? {
    icon: Droplets,
    label: 'CRITICAL ALERT',
    labelBg: 'bg-red-500/20',
    labelColor: 'text-red-400',
    iconColor: 'text-red-400',
    barBg: 'bg-red-500/30',
    barFill: 'bg-red-500',
    valueColor: 'text-red-400'
  } : {
    icon: Flame,
    label: 'HIGH TEMP',
    labelBg: 'bg-orange-500/20',
    labelColor: 'text-orange-400',
    iconColor: 'text-orange-400',
    barBg: 'bg-orange-500/30',
    barFill: 'bg-orange-500',
    valueColor: 'text-orange-400'
  };
  
  const Icon = config.icon;
  const percentage = isMoisture ? 88.4 : 75; // For visual bar

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="absolute z-50 pointer-events-auto"
        style={{ 
          left: position.x, 
          top: position.y,
          transform: 'translate(-50%, -100%)'
        }}
      >
        <div className="bg-slate-800/95 backdrop-blur-md rounded-xl border border-slate-600/50 shadow-2xl shadow-black/50 min-w-[220px] overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.labelBg}`}>
                <Icon className={`w-3 h-3 ${config.iconColor}`} />
                <span className={`text-xs font-semibold tracking-wide ${config.labelColor}`}>
                  {config.label}
                </span>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            
            <h3 className="text-white font-semibold text-sm">
              {alert.title}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {alert.locationName}
            </p>
          </div>
          
          {/* Metric */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs font-medium tracking-wider">
                {alert.metric}
              </span>
              <span className={`text-sm font-bold ${config.valueColor}`}>
                {alert.value}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className={`h-1.5 rounded-full ${config.barBg} overflow-hidden`}>
              <motion.div 
                className={`h-full rounded-full ${config.barFill}`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
          
          {/* Connector Line */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
            <div className="w-0.5 h-8 bg-gradient-to-b from-slate-500 to-transparent" />
            <div className="w-2 h-2 rounded-full bg-white shadow-lg shadow-white/50 -mt-0.5 -ml-[3px]" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}