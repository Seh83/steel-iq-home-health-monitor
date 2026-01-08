import React from 'react';
import { LayoutDashboard, Activity, Box, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', page: 'Dashboard', active: true },
  { id: 'sensors', icon: Activity, label: 'Sensors', page: 'Sensors' },
  { id: 'twin', icon: Box, label: 'Digital Twin', page: 'Dashboard' },
  { id: 'settings', icon: Settings, label: 'Settings', page: 'Dashboard' }
];

export default function Sidebar() {
  return (
    <div className="w-16 bg-slate-900 flex flex-col items-center py-4 border-r border-slate-700/50">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg mb-8">
        S
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = window.location.pathname.includes(item.page);
          return (
            <Link
              key={item.id}
              to={createPageUrl(item.page)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>
      
      {/* User Avatar */}
      <div className="mt-auto">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" 
            alt="User"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}