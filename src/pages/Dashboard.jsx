import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import StatusCards from '@/components/dashboard/StatusCards';
import DigitalTwinViewer from '@/components/dashboard/DigitalTwinViewer';
import { sensorData } from '@/components/dashboard/sensorData';

export default function Dashboard() {
  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header alertCount={sensorData.alerts.length} />
        
        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status Cards */}
          <StatusCards data={sensorData} />
          
          {/* 3D Digital Twin Viewer */}
          <DigitalTwinViewer alerts={sensorData.alerts} />
        </div>
      </div>
    </div>
  );
}