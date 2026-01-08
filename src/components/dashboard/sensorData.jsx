// Simulated sensor data for the Steel-IQ dashboard
export const sensorData = {
  systemStatus: "Needs Attention",
  systemStatusCode: "CRITICAL_ERROR_L4",
  activeSensors: {
    online: 142,
    total: 145,
    signalStrength: 97.9
  },
  currentLoad: {
    status: "Stable",
    value: "8.42kN",
    label: "NOMINAL"
  },
  alerts: [
    {
      id: "alert-1",
      type: "moisture",
      severity: "critical",
      title: "Moisture Detected",
      locationId: "panel-a-104",
      locationName: "Bath Wall | Section A4",
      metric: "HUMIDITY",
      value: "88.4%",
      status: "Active Leak",
      coordinates: { x: -3, y: 2, z: 2 }
    },
    {
      id: "alert-2",
      type: "thermal",
      severity: "warning",
      title: "Critical Heat Rise",
      locationId: "junction-j-022",
      locationName: "J-Box 4 | Electrical Hub",
      metric: "TEMP",
      value: "135.2°F",
      status: "Warning",
      coordinates: { x: 2.5, y: 1, z: -1 }
    }
  ]
};

export const viewModes = [
  { id: "live", label: "LIVE STREAM", active: true },
  { id: "model", label: "Model View", active: false },
  { id: "thermal", label: "Thermal", active: false },
  { id: "stress", label: "Stress", active: false }
];