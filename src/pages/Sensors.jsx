import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Battery, MapPin, Calendar, Activity, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SensorActionModal from '@/components/sensors/SensorActionModal';
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
    online: { color: 'text-green-400', bg: 'bg-green-500/20', dot: 'bg-green-500' },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', dot: 'bg-yellow-500' },
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', dot: 'bg-red-500' },
    offline: { color: 'text-slate-400', bg: 'bg-slate-500/20', dot: 'bg-slate-500' }
  };
  return configs[status] || configs.offline;
};

export default function SensorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);

  const { data: sensors = [], isLoading: sensorsLoading } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => base44.entities.Sensor.list(),
  });

  const { data: panels = [], isLoading: panelsLoading } = useQuery({
    queryKey: ['panels'],
    queryFn: () => base44.entities.Panel.list(),
  });

  const getPanelForSensor = (panelId) => {
    return panels.find(p => p.panel_id === panelId);
  };

  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = sensor.sensor_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sensor.sensor_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sensor.status === filterStatus;
    const matchesType = filterType === 'all' || sensor.sensor_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSensorClick = (sensor) => {
    setSelectedSensor(sensor);
    setSelectedPanel(getPanelForSensor(sensor.panel_id));
  };

  const handlePing = (sensor) => {
    // This would trigger the 3D visualization
    console.log('Pinging sensor:', sensor.sensor_id);
  };

  // Statistics
  const stats = {
    total: sensors.length,
    online: sensors.filter(s => s.status === 'online').length,
    warning: sensors.filter(s => s.status === 'warning').length,
    critical: sensors.filter(s => s.status === 'critical').length,
    avgBattery: sensors.length > 0 ? Math.round(sensors.reduce((sum, s) => sum + s.battery_level, 0) / sensors.length) : 0
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Sensor Management</h1>
          <p className="text-slate-400">Monitor and manage all sensors across your home</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Total Sensors</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Online</p>
            <p className="text-2xl font-bold text-green-400">{stats.online}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Warnings</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.warning}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Critical</p>
            <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Avg Battery</p>
            <p className="text-2xl font-bold text-blue-400">{stats.avgBattery}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search sensors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-slate-700/50 border-slate-600">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 bg-slate-700/50 border-slate-600">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="temperature">Temperature</SelectItem>
                <SelectItem value="moisture">Moisture</SelectItem>
                <SelectItem value="stress">Stress</SelectItem>
                <SelectItem value="vibration">Vibration</SelectItem>
                <SelectItem value="air_quality">Air Quality</SelectItem>
                <SelectItem value="smoke">Smoke</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sensors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSensors.map((sensor) => {
            const status = getStatusConfig(sensor.status);
            const panel = getPanelForSensor(sensor.panel_id);
            
            return (
              <button
                key={sensor.id}
                onClick={() => handleSensorClick(sensor)}
                className="bg-slate-800/60 hover:bg-slate-800 rounded-xl p-5 border border-slate-700/50 hover:border-blue-500/50 transition-all text-left"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getSensorIcon(sensor.sensor_type)}</span>
                    <div>
                      <p className="text-white font-semibold">{sensor.sensor_id}</p>
                      <p className="text-slate-400 text-sm capitalize">{sensor.sensor_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bg}`}>
                    <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
                    <span className={`text-xs font-semibold ${status.color} uppercase`}>
                      {sensor.status}
                    </span>
                  </div>
                </div>

                {/* Reading */}
                <div className="bg-slate-700/30 rounded-lg p-3 mb-3">
                  <p className="text-slate-400 text-xs mb-1">Current Reading</p>
                  <p className={`text-xl font-bold ${status.color}`}>
                    {sensor.last_reading} {sensor.reading_unit}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      Location
                    </span>
                    <span className="text-white font-medium">{panel?.panel_name || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Battery className="w-3.5 h-3.5" />
                      Battery
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sensor.battery_level > 70 ? 'bg-green-500' :
                            sensor.battery_level > 30 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sensor.battery_level}%` }}
                        />
                      </div>
                      <span className="text-white font-medium text-xs">{sensor.battery_level}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" />
                      Last Ping
                    </span>
                    <span className="text-white font-medium">
                      {sensor.last_ping ? format(new Date(sensor.last_ping), 'HH:mm:ss') : 'N/A'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredSensors.length === 0 && !sensorsLoading && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No sensors found matching your filters</p>
          </div>
        )}
      </div>

      {/* Sensor Action Modal */}
      {selectedSensor && (
        <SensorActionModal
          sensor={selectedSensor}
          panel={selectedPanel}
          onClose={() => {
            setSelectedSensor(null);
            setSelectedPanel(null);
          }}
          onPing={handlePing}
        />
      )}
    </div>
  );
}