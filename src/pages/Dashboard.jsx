import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import StatusCards from '@/components/dashboard/StatusCards';
import DigitalTwinViewer from '@/components/dashboard/DigitalTwinViewer';
import { sensorData } from '@/components/dashboard/sensorData';

export default function Dashboard() {
  const { data: sensors = [] } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => base44.entities.Sensor.list(),
  });

  const { data: panels = [] } = useQuery({
    queryKey: ['panels'],
    queryFn: () => base44.entities.Panel.list(),
  });

  // Calculate real-time stats
  const criticalSensors = sensors.filter(s => s.status === 'critical').length;
  const enhancedData = {
    ...sensorData,
    activeSensors: {
      online: sensors.filter(s => s.status === 'online').length,
      total: sensors.length,
      signalStrength: 97.9
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header alertCount={criticalSensors} />
        
        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status Cards */}
          <StatusCards data={enhancedData} />
          
          {/* 3D Digital Twin Viewer */}
          <DigitalTwinViewer alerts={sensorData.alerts} panels={panels} sensors={sensors} />
        </div>
      </div>
    </div>
  );
}