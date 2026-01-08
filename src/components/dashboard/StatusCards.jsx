import React from 'react';
import { AlertTriangle, CheckCircle, Cpu } from 'lucide-react';

export default function StatusCards({ data }) {
  const cards = [
    {
      id: 'status',
      label: 'SYSTEM STATUS',
      value: data.systemStatus,
      subValue: data.systemStatusCode,
      icon: AlertTriangle,
      status: 'critical',
      borderColor: 'border-red-500/50',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-500',
      valueColor: 'text-white',
      subValueColor: 'text-red-400'
    },
    {
      id: 'sensors',
      label: 'ACTIVE SENSORS',
      value: `${data.activeSensors.online}/${data.activeSensors.total}`,
      valueLabel: 'Online',
      subValue: `${data.activeSensors.signalStrength}% SIGNAL`,
      icon: CheckCircle,
      status: 'healthy',
      borderColor: 'border-slate-600/50',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-500',
      valueColor: 'text-white',
      subValueColor: 'text-green-400'
    },
    {
      id: 'load',
      label: 'CURRENT LOAD',
      value: data.currentLoad.status,
      subValue: `${data.currentLoad.value} ${data.currentLoad.label}`,
      icon: Cpu,
      status: 'stable',
      borderColor: 'border-slate-600/50',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-500',
      valueColor: 'text-white',
      subValueColor: 'text-cyan-400'
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.id}
            className={`bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border ${card.borderColor} transition-all hover:bg-slate-800/80`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium tracking-wider">
                {card.label}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xl font-semibold ${card.valueColor}`}>
                {card.value}
              </span>
              {card.valueLabel && (
                <span className="text-slate-400 text-sm">{card.valueLabel}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full ${card.iconBg} flex items-center justify-center`}>
                <Icon className={`w-3 h-3 ${card.iconColor}`} />
              </div>
              <span className={`text-xs font-medium ${card.subValueColor}`}>
                {card.subValue}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}