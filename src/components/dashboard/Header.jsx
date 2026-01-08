import React, { useState, useEffect } from 'react';
import { Building2, Bell } from 'lucide-react';

export default function Header({ alertCount = 2 }) {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6">
      {/* Left - Location */}
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-slate-400" />
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">Riviera Lane - Unit 4B</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Live Monitor</span>
        </div>
      </div>
      
      {/* Right - Notifications & Time */}
      <div className="flex items-center gap-6">
        <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
              {alertCount}
            </span>
          )}
        </button>
        
        <div className="text-right">
          <span className="text-slate-500 text-sm">System Time: </span>
          <span className="text-white font-mono font-medium">{formatTime(time)}</span>
          <span className="text-slate-500 text-sm ml-1">UTC</span>
        </div>
      </div>
    </header>
  );
}