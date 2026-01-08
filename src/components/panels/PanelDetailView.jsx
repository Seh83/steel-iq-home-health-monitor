import React from 'react';
import { X, Activity, Calendar, Layers, MapPin, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const getSensorIcon = (type) => {
  const icons = {
    temperature: '🌡️',
    moisture: '💧',
    stress: '⚡',
    vibration: '〰️',
    air_quality: '🌫️',
    smoke: '🔥'
  };
  return icons[type] || '📡';
};

const getStatusConfig = (status) => {
  const configs = {
    online: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: CheckCircle },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: AlertTriangle },
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: AlertTriangle },
    offline: { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30', icon: WifiOff }
  };
  return configs[status] || configs.offline;
};

export default function PanelDetailView({ panel, sensors, onClose, onSensorClick }) {
  if (!panel) return null;

  const panelStatus = getStatusConfig(panel.status);
  const StatusIcon = panelStatus.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 rounded-xl border border-slate-600/50 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-6 border-b border-slate-600/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{panel.panel_name}</h2>
                  <p className="text-slate-400 text-sm mt-1">{panel.panel_id} • {panel.location}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mt-4 ${panelStatus.bg} ${panelStatus.border}`}>
              <StatusIcon className={`w-4 h-4 ${panelStatus.color}`} />
              <span className={`text-sm font-semibold ${panelStatus.color} uppercase`}>
                {panel.status}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Panel Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Layers className="w-4 h-4" />
                  <span>Type</span>
                </div>
                <p className="text-white font-medium capitalize">{panel.panel_type}</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>Dimensions</span>
                </div>
                <p className="text-white font-medium">{panel.dimensions}</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Material</span>
                </div>
                <p className="text-white font-medium text-sm">{panel.material}</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Installed</span>
                </div>
                <p className="text-white font-medium">
                  {panel.install_date ? format(new Date(panel.install_date), 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
            </div>

            {/* Sensors Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Attached Sensors ({sensors.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sensors.map((sensor) => {
                  const sensorStatus = getStatusConfig(sensor.status);
                  const SensorStatusIcon = sensorStatus.icon;
                  
                  return (
                    <motion.button
                      key={sensor.sensor_id}
                      onClick={() => onSensorClick(sensor)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-slate-700/50 hover:bg-slate-700/70 rounded-lg p-4 border border-slate-600/50 hover:border-blue-500/50 transition-all text-left"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getSensorIcon(sensor.sensor_type)}</span>
                          <div>
                            <p className="text-white font-medium">{sensor.sensor_id}</p>
                            <p className="text-slate-400 text-xs capitalize">{sensor.sensor_type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <SensorStatusIcon className={`w-4 h-4 ${sensorStatus.color}`} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Reading</p>
                          <p className={`font-semibold ${sensorStatus.color}`}>
                            {sensor.last_reading} {sensor.reading_unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Battery</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  sensor.battery_level > 70 ? 'bg-green-500' :
                                  sensor.battery_level > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${sensor.battery_level}%` }}
                              />
                            </div>
                            <span className="text-white text-xs font-medium">{sensor.battery_level}%</span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}