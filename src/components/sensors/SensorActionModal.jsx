import React, { useState } from 'react';
import { X, Power, Radio, RefreshCw, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function SensorActionModal({ sensor, panel, onClose, onPing }) {
  const [isRebooting, setIsRebooting] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [actionComplete, setActionComplete] = useState(null);

  if (!sensor) return null;

  const handleReboot = async () => {
    setIsRebooting(true);
    toast.info(`Rebooting sensor ${sensor.sensor_id}...`);
    
    // Simulate reboot
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsRebooting(false);
    setActionComplete('reboot');
    toast.success(`Sensor ${sensor.sensor_id} rebooted successfully`);
    
    setTimeout(() => {
      setActionComplete(null);
    }, 2000);
  };

  const handlePing = async () => {
    setIsPinging(true);
    toast.info(`Pinging sensor ${sensor.sensor_id}...`);
    
    // Trigger visual effect on 3D model
    if (onPing) {
      onPing(sensor);
    }
    
    // Simulate ping
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsPinging(false);
    setActionComplete('ping');
    toast.success(`Sensor ${sensor.sensor_id} pinged successfully`);
    
    setTimeout(() => {
      setActionComplete(null);
    }, 2000);
  };

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
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-slate-800 rounded-xl border border-slate-600/50 max-w-lg w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-5 border-b border-slate-600/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getSensorIcon(sensor.sensor_type)}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{sensor.sensor_id}</h3>
                  <p className="text-slate-400 text-sm capitalize">{sensor.sensor_type.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Sensor Info */}
            <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Location</p>
                  <p className="text-white text-sm font-medium">{panel?.panel_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Status</p>
                  <p className={`text-sm font-semibold capitalize ${
                    sensor.status === 'online' ? 'text-green-400' :
                    sensor.status === 'warning' ? 'text-yellow-400' :
                    sensor.status === 'critical' ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {sensor.status}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Current Reading</p>
                  <p className="text-white text-sm font-medium">
                    {sensor.last_reading} {sensor.reading_unit}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Battery</p>
                  <p className="text-white text-sm font-medium">{sensor.battery_level}%</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="text-slate-300 font-semibold text-sm mb-3">Sensor Actions</h4>
              
              {/* Ping Sensor */}
              <button
                onClick={handlePing}
                disabled={isPinging || isRebooting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg p-4 flex items-center gap-3 transition-all group"
              >
                {isPinging ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <div className="text-left flex-1">
                      <p className="font-semibold">Pinging Sensor...</p>
                      <p className="text-sm text-blue-200">Generating audio chime</p>
                    </div>
                  </>
                ) : actionComplete === 'ping' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <div className="text-left flex-1">
                      <p className="font-semibold">Ping Successful</p>
                      <p className="text-sm text-blue-200">Sensor located</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5" />
                    <div className="text-left flex-1">
                      <p className="font-semibold">Ping Sensor</p>
                      <p className="text-sm text-blue-200">Generates a low chime to locate the sensor</p>
                    </div>
                  </>
                )}
              </button>

              {/* Reboot Sensor */}
              <button
                onClick={handleReboot}
                disabled={isRebooting || isPinging}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white rounded-lg p-4 flex items-center gap-3 transition-all"
              >
                {isRebooting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <div className="text-left flex-1">
                      <p className="font-semibold">Rebooting Sensor...</p>
                      <p className="text-sm text-slate-300">Please wait</p>
                    </div>
                  </>
                ) : actionComplete === 'reboot' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <div className="text-left flex-1">
                      <p className="font-semibold">Reboot Complete</p>
                      <p className="text-sm text-slate-300">Sensor is online</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Power className="w-5 h-5" />
                    <div className="text-left flex-1">
                      <p className="font-semibold">Reboot Sensor</p>
                      <p className="text-sm text-slate-300">Restart the sensor to clear errors</p>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}