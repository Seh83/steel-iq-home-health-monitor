import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import AlertTooltip from './AlertTooltip';
import ViewControls from './ViewControls';
import ComponentPropertiesPanel from './ComponentPropertiesPanel';
import PanelDetailView from '../panels/PanelDetailView';
import SensorActionModal from '../sensors/SensorActionModal';

// Warehouse building generator
function createWarehouse() {
  const group = new THREE.Group();
  const components = []; // Track all components for interaction
  
  const steelMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x556677,
    metalness: 0.9,
    roughness: 0.2
  });
  
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4d8dd,
    metalness: 0.3,
    roughness: 0.7,
    side: THREE.DoubleSide
  });

  // Helper to create structural elements
  const createBeam = (width, height, depth) => {
    return new THREE.BoxGeometry(width, height, depth);
  };
  
  // Helper to add component with metadata
  const addComponent = (geometry, position, type, componentId, additionalData = {}) => {
    const mesh = new THREE.Mesh(geometry, steelMaterial.clone());
    mesh.position.set(...position);
    
    // Store metadata
    mesh.userData = {
      id: componentId,
      type: type,
      material: 'Steel C-Channel',
      position: { x: position[0], y: position[1], z: position[2] },
      selectable: true,
      ...additionalData
    };
    
    group.add(mesh);
    components.push(mesh);
    return mesh;
  };

  // Warehouse dimensions
  const warehouseWidth = 20;
  const warehouseDepth = 15;
  const wallHeight = 6;
  const columnSpacing = 5;
  const beamSize = 0.15;

  // Create warehouse structure
  let componentCounter = 1;
  
  // Steel columns (corner and intermediate)
  let columnCounter = 1;
  for (let x = -warehouseWidth/2; x <= warehouseWidth/2; x += columnSpacing) {
    for (let z = -warehouseDepth/2; z <= warehouseDepth/2; z += columnSpacing) {
      addComponent(
        createBeam(beamSize, wallHeight, beamSize),
        [x, wallHeight/2, z],
        'Structural Column',
        `COL-${columnCounter++}`,
        { dimensions: `${beamSize.toFixed(2)}m x ${wallHeight}m x ${beamSize.toFixed(2)}m`, weight: '285 kg', loadRating: '2500 kN', status: 'Good', sensors: 2, lastInspection: '2024-12-15', installDate: '2024-03-10', readings: [{ label: 'Load', value: '1.24 kN' }, { label: 'Temp', value: '68°F' }] }
      );
    }
  }
  
  // Perimeter beams (top)
  let beamCounter = 1;
  // Front and back horizontal beams
  for (let x = -warehouseWidth/2; x < warehouseWidth/2; x += columnSpacing) {
    addComponent(
      createBeam(columnSpacing, beamSize, beamSize),
      [x + columnSpacing/2, wallHeight, -warehouseDepth/2],
      'Perimeter Beam',
      `PB-F${beamCounter}`,
      { dimensions: `${columnSpacing}m x ${beamSize.toFixed(2)}m x ${beamSize.toFixed(2)}m`, weight: '180 kg', loadRating: '1800 kN', status: 'Good', sensors: 2, lastInspection: '2024-12-10', installDate: '2024-03-12', readings: [{ label: 'Stress', value: '0.85 kN' }, { label: 'Temp', value: '69°F' }] }
    );
    addComponent(
      createBeam(columnSpacing, beamSize, beamSize),
      [x + columnSpacing/2, wallHeight, warehouseDepth/2],
      'Perimeter Beam',
      `PB-B${beamCounter++}`,
      { dimensions: `${columnSpacing}m x ${beamSize.toFixed(2)}m x ${beamSize.toFixed(2)}m`, weight: '180 kg', loadRating: '1800 kN', status: 'Good', sensors: 2, lastInspection: '2024-12-10', installDate: '2024-03-12', readings: [{ label: 'Stress', value: '0.82 kN' }, { label: 'Temp', value: '70°F' }] }
    );
  }
  
  // Left and right horizontal beams
  for (let z = -warehouseDepth/2; z < warehouseDepth/2; z += columnSpacing) {
    addComponent(
      createBeam(beamSize, beamSize, columnSpacing),
      [-warehouseWidth/2, wallHeight, z + columnSpacing/2],
      'Perimeter Beam',
      `PB-L${beamCounter}`,
      { dimensions: `${beamSize.toFixed(2)}m x ${beamSize.toFixed(2)}m x ${columnSpacing}m`, weight: '180 kg', loadRating: '1800 kN', status: 'Good', sensors: 2, lastInspection: '2024-12-10', installDate: '2024-03-12', readings: [{ label: 'Stress', value: '0.88 kN' }, { label: 'Temp', value: '68°F' }] }
    );
    addComponent(
      createBeam(beamSize, beamSize, columnSpacing),
      [warehouseWidth/2, wallHeight, z + columnSpacing/2],
      'Perimeter Beam',
      `PB-R${beamCounter++}`,
      { dimensions: `${beamSize.toFixed(2)}m x ${beamSize.toFixed(2)}m x ${columnSpacing}m`, weight: '180 kg', loadRating: '1800 kN', status: 'Good', sensors: 2, lastInspection: '2024-12-10', installDate: '2024-03-12', readings: [{ label: 'Stress', value: '0.79 kN' }, { label: 'Temp', value: '71°F' }] }
    );
  }
  
  // Internal support beams
  let internalBeamCounter = 1;
  for (let z = -warehouseDepth/2 + columnSpacing; z < warehouseDepth/2; z += columnSpacing) {
    for (let x = -warehouseWidth/2; x < warehouseWidth/2; x += columnSpacing) {
      addComponent(
        createBeam(columnSpacing, beamSize, beamSize),
        [x + columnSpacing/2, wallHeight, z],
        'Support Beam',
        `SB-${internalBeamCounter++}`,
        { dimensions: `${columnSpacing}m x ${beamSize.toFixed(2)}m x ${beamSize.toFixed(2)}m`, weight: '180 kg', loadRating: '1500 kN', status: 'Good', sensors: 1, lastInspection: '2024-12-08', installDate: '2024-03-14', readings: [{ label: 'Stress', value: '0.65 kN' }, { label: 'Temp', value: '70°F' }] }
      );
    }
  }
  
  // Roof trusses
  const roofHeight = 2.5;
  let trussCounter = 1;
  for (let z = -warehouseDepth/2; z <= warehouseDepth/2; z += columnSpacing) {
    // Main truss beam
    addComponent(
      createBeam(warehouseWidth, beamSize, beamSize),
      [0, wallHeight + roofHeight/2, z],
      'Roof Truss',
      `RT-${trussCounter++}`,
      { dimensions: `${warehouseWidth}m x ${beamSize.toFixed(2)}m x ${beamSize.toFixed(2)}m`, weight: '320 kg', loadRating: '2200 kN', status: 'Good', sensors: 3, lastInspection: '2024-12-05', installDate: '2024-03-18', readings: [{ label: 'Stress', value: '0.92 kN' }, { label: 'Temp', value: '66°F' }] }
    );
  }

  // Warehouse wall and roof panels
  const corrugatedPanelMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8eaed,
    metalness: 0.6,
    roughness: 0.4,
    side: THREE.DoubleSide
  });
  
  // Concrete floor
  const floorGeometry = new THREE.BoxGeometry(warehouseWidth, 0.2, warehouseDepth);
  const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x888888,
    roughness: 0.9,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeometry, floorMat);
  floor.position.y = -0.1;
  group.add(floor);
  
  // Front wall panels (with large door opening)
  const doorWidth = 6;
  const doorHeight = 5;
  const frontLeftPanel = new THREE.Mesh(
    new THREE.PlaneGeometry((warehouseWidth - doorWidth)/2, wallHeight),
    corrugatedPanelMaterial.clone()
  );
  frontLeftPanel.position.set(-warehouseWidth/4 - doorWidth/4, wallHeight/2, -warehouseDepth/2);
  group.add(frontLeftPanel);
  
  const frontRightPanel = new THREE.Mesh(
    new THREE.PlaneGeometry((warehouseWidth - doorWidth)/2, wallHeight),
    corrugatedPanelMaterial.clone()
  );
  frontRightPanel.position.set(warehouseWidth/4 + doorWidth/4, wallHeight/2, -warehouseDepth/2);
  group.add(frontRightPanel);
  
  const frontTopPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(doorWidth, wallHeight - doorHeight),
    corrugatedPanelMaterial.clone()
  );
  frontTopPanel.position.set(0, wallHeight - (wallHeight - doorHeight)/2, -warehouseDepth/2);
  group.add(frontTopPanel);
  
  // Back wall panel
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(warehouseWidth, wallHeight),
    corrugatedPanelMaterial.clone()
  );
  backWall.position.set(0, wallHeight/2, warehouseDepth/2);
  backWall.rotation.y = Math.PI;
  group.add(backWall);
  
  // Side walls
  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(warehouseDepth, wallHeight),
    corrugatedPanelMaterial.clone()
  );
  leftWall.position.set(-warehouseWidth/2, wallHeight/2, 0);
  leftWall.rotation.y = Math.PI / 2;
  group.add(leftWall);
  
  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(warehouseDepth, wallHeight),
    corrugatedPanelMaterial.clone()
  );
  rightWall.position.set(warehouseWidth/2, wallHeight/2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  group.add(rightWall);
  
  // Flat roof panels
  const roofPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(warehouseWidth, warehouseDepth),
    corrugatedPanelMaterial.clone()
  );
  roofPanel.position.y = wallHeight + roofHeight;
  roofPanel.rotation.x = Math.PI / 2;
  group.add(roofPanel);

  group.userData.components = components;
  return group;
}

// Alert marker component
function AlertMarker({ position, type, isActive, onClick }) {
  const color = type === 'moisture' ? '#ef4444' : '#f97316';
  
  return (
    <div 
      className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      style={{ left: position.x, top: position.y }}
      onClick={onClick}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative"
      >
        <div 
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}
        />
        <motion.div
          animate={{ scale: [1, 2], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      </motion.div>
    </div>
  );
}

export default function DigitalTwinViewer({ alerts, panels = [], sensors = [] }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(null);
  
  const [activeView, setActiveView] = useState('live');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [markerPositions, setMarkerPositions] = useState([]);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [webglError, setWebglError] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [hoveredComponent, setHoveredComponent] = useState(null);
  const [isRotating, setIsRotating] = useState(true);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [pingingPanelId, setPingingPanelId] = useState(null);
  
  const mouseRef = useRef({ x: 0, y: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const panelMarkersRef = useRef([]);
  const sensorMarkersRef = useRef([]);
  const selectedComponentRef = useRef(null);
  const hoveredComponentRef = useRef(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e3a5f);
    scene.fog = new THREE.Fog(0x1e3a5f, 15, 40);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(15, 10, 15);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // Renderer with error handling
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        failIfMajorPerformanceCaveat: false
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      setWebglError(true);
      return;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a365d,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Warehouse structure
    const warehouse = createWarehouse();
    warehouse.position.y = 0.1;
    scene.add(warehouse);
    frameRef.current = warehouse;

    // Add panel markers
    panels.forEach(panel => {
      const panelGroup = new THREE.Group();
      panelGroup.userData = { 
        type: 'panel', 
        panelData: panel,
        selectable: true 
      };
      
      // Panel indicator
      const indicatorGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const statusColors = {
        good: 0x10b981,
        warning: 0xf59e0b,
        critical: 0xef4444,
        offline: 0x64748b
      };
      const indicatorMaterial = new THREE.MeshStandardMaterial({
        color: statusColors[panel.status] || 0x64748b,
        emissive: statusColors[panel.status] || 0x64748b,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.4
      });
      
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      panelGroup.add(indicator);
      
      // Pulsing ring
      const ringGeometry = new THREE.RingGeometry(0.2, 0.25, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: statusColors[panel.status] || 0x64748b,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      panelGroup.add(ring);
      
      panelGroup.position.set(panel.position.x, panel.position.y, panel.position.z);
      scene.add(panelGroup);
      panelMarkersRef.current.push({ group: panelGroup, panel, ring });
    });

    // Add sensor markers
    sensors.forEach(sensor => {
      const sensorGroup = new THREE.Group();
      sensorGroup.userData = { 
        type: 'sensor', 
        sensorData: sensor,
        selectable: true 
      };
      
      const sensorGeometry = new THREE.SphereGeometry(0.08, 12, 12);
      const statusColors = {
        online: 0x10b981,
        warning: 0xf59e0b,
        critical: 0xef4444,
        offline: 0x64748b
      };
      const sensorMaterial = new THREE.MeshStandardMaterial({
        color: statusColors[sensor.status] || 0x10b981,
        emissive: statusColors[sensor.status] || 0x10b981,
        emissiveIntensity: 0.8,
        metalness: 0.5,
        roughness: 0.3
      });
      
      const sensorMesh = new THREE.Mesh(sensorGeometry, sensorMaterial);
      sensorGroup.add(sensorMesh);
      
      sensorGroup.position.set(sensor.position.x, sensor.position.y, sensor.position.z);
      scene.add(sensorGroup);
      sensorMarkersRef.current.push({ group: sensorGroup, sensor, mesh: sensorMesh });
    });

    // Sky gradient
    const skyGeometry = new THREE.SphereGeometry(30, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1e3a5f) },
        bottomColor: { value: new THREE.Color(0x0f172a) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    // Mouse interaction handlers
    const onMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Manual camera rotation
      if (isDraggingRef.current && !isRotating) {
        const deltaX = event.clientX - previousMouseRef.current.x;
        const deltaY = event.clientY - previousMouseRef.current.y;
        
        const rotationSpeed = 0.005;
        
        // Rotate camera around center
        const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
        let angle = Math.atan2(camera.position.z, camera.position.x);
        angle -= deltaX * rotationSpeed;
        
        camera.position.x = radius * Math.cos(angle);
        camera.position.z = radius * Math.sin(angle);
        
        // Adjust height
        camera.position.y = Math.max(2, Math.min(20, camera.position.y - deltaY * 0.05));
        
        camera.lookAt(0, 2, 0);
      }
      
      previousMouseRef.current = { x: event.clientX, y: event.clientY };
      
      // Raycasting for hover effect
      if (!isDraggingRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const components = warehouse.userData.components || [];
        const intersects = raycasterRef.current.intersectObjects(components, false);
        
        if (intersects.length > 0) {
          const intersected = intersects[0].object;
          if (intersected.userData.selectable) {
            container.style.cursor = 'pointer';
            setHoveredComponent(intersected);
            
            // Highlight hovered component
            if (intersected !== selectedComponentRef.current) {
              intersected.material.emissive.setHex(0x555555);
            }
          }
        } else {
          container.style.cursor = 'grab';
          if (hoveredComponentRef.current && hoveredComponentRef.current !== selectedComponentRef.current) {
            hoveredComponentRef.current.material.emissive.setHex(0x000000);
          }
          setHoveredComponent(null);
        }
      }
    };
    
    const onMouseDown = (event) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: event.clientX, y: event.clientY };
      container.style.cursor = 'grabbing';
      setIsRotating(false);
    };
    
    const onMouseUp = () => {
      isDraggingRef.current = false;
      container.style.cursor = 'grab';
    };
    
    const onClick = (event) => {
      if (Math.abs(event.clientX - previousMouseRef.current.x) > 5 || 
          Math.abs(event.clientY - previousMouseRef.current.y) > 5) {
        return; // Was dragging
      }
      
      const rect = container.getBoundingClientRect();
      const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
      };
      
      raycasterRef.current.setFromCamera(mouse, camera);
      
      // Check panels and sensors first
      const allMarkers = [...panelMarkersRef.current.map(p => p.group), ...sensorMarkersRef.current.map(s => s.group)];
      const markerIntersects = raycasterRef.current.intersectObjects(allMarkers, true);
      
      if (markerIntersects.length > 0) {
        const intersected = markerIntersects[0].object.parent;
        const userData = intersected.userData;
        
        if (userData.type === 'panel') {
          const panelSensors = sensors.filter(s => s.panel_id === userData.panelData.panel_id);
          setSelectedPanel(userData.panelData);
          setSelectedComponent(null);
          setSelectedAlert(null);
          // Don't open modal here, just show selection
        } else if (userData.type === 'sensor') {
          const panel = panels.find(p => p.panel_id === userData.sensorData.panel_id);
          setSelectedSensor(userData.sensorData);
          setSelectedPanel(panel);
          setSelectedComponent(null);
          setSelectedAlert(null);
        }
        return;
      }
      
      // Then check components
      const components = warehouse.userData.components || [];
      const intersects = raycasterRef.current.intersectObjects(components, false);
      
      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        if (intersected.userData.selectable) {
          // Deselect previous
          if (selectedComponentRef.current && selectedComponentRef.current !== intersected) {
            selectedComponentRef.current.material.emissive.setHex(0x000000);
          }
          
          // Select new
          selectedComponentRef.current = intersected;
          intersected.material.emissive.setHex(0x4488ff);
          setSelectedComponent(intersected.userData);
          setSelectedAlert(null);
          setSelectedPanel(null);
          setSelectedSensor(null);
        }
      }
    };
    
    const onWheel = (event) => {
      event.preventDefault();
      const zoomSpeed = 0.1;
      const delta = event.deltaY * zoomSpeed;
      
      const factor = delta > 0 ? 1.1 : 0.9;
      camera.position.multiplyScalar(factor);
      
      // Clamp distance
      const distance = camera.position.length();
      if (distance < 8) camera.position.normalize().multiplyScalar(8);
      if (distance > 30) camera.position.normalize().multiplyScalar(30);
    };
    
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onClick);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation
    let angle = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Auto rotation when enabled
      if (isRotating) {
        angle += 0.001;
        camera.position.x = 18 * Math.cos(angle);
        camera.position.z = 18 * Math.sin(angle);
        camera.lookAt(0, 2, 0);
      }
      
      // Update hovered component reference
      hoveredComponentRef.current = hoveredComponent;
      
      // Animate panel rings
      const time = Date.now() * 0.001;
      panelMarkersRef.current.forEach(({ ring, panel }) => {
        ring.scale.set(1 + Math.sin(time * 2) * 0.1, 1 + Math.sin(time * 2) * 0.1, 1);
        ring.material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
      });
      
      // Pulse sensors
      sensorMarkersRef.current.forEach(({ mesh }, idx) => {
        mesh.scale.setScalar(1 + Math.sin(time * 3 + idx * 0.5) * 0.15);
      });
      
      // Ping effect
      if (pingingPanelId) {
        const panelMarker = panelMarkersRef.current.find(p => p.panel.panel_id === pingingPanelId);
        if (panelMarker) {
          const pingTime = (Date.now() % 2000) / 2000; // 2 second cycle
          panelMarker.ring.scale.setScalar(1 + pingTime * 3);
          panelMarker.ring.material.opacity = 0.6 * (1 - pingTime);
        }
      }
      
      renderer.render(scene, camera);
      
      // Update marker positions
      updateMarkerPositions();
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('click', onClick);
      container.removeEventListener('wheel', onWheel);
      
      if (renderer && container.contains(renderer.domElement)) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }
    };
  }, [isRotating, hoveredComponent, pingingPanelId, panels, sensors]);

  // Update 2D positions for 3D alert markers
  const updateMarkerPositions = () => {
    if (!cameraRef.current || !containerRef.current) return;
    
    const camera = cameraRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const positions = alerts.map(alert => {
      const vector = new THREE.Vector3(
        alert.coordinates.x,
        alert.coordinates.y,
        alert.coordinates.z
      );
      vector.project(camera);
      
      return {
        id: alert.id,
        x: (vector.x * 0.5 + 0.5) * rect.width,
        y: (-vector.y * 0.5 + 0.5) * rect.height,
        visible: vector.z < 1
      };
    });
    
    setMarkerPositions(positions);
  };

  const handleAlertClick = (alert, markerPos) => {
    setSelectedAlert(alert);
    setTooltipPosition({ x: markerPos.x, y: markerPos.y - 40 });
  };

  const handleZoom = (direction) => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    
    if (direction === 'in') {
      camera.position.multiplyScalar(0.9);
    } else if (direction === 'out') {
      camera.position.multiplyScalar(1.1);
    } else if (direction === 'reset') {
      camera.position.set(15, 10, 15);
      setIsRotating(true);
      setSelectedComponent(null);
    }
    
    // Clamp distance
    const distance = camera.position.length();
    if (distance < 8) camera.position.normalize().multiplyScalar(8);
    if (distance > 30) camera.position.normalize().multiplyScalar(30);
  };

  return (
    <div className="relative flex-1 bg-slate-900 overflow-hidden">
      {/* WebGL Error Fallback */}
      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">3D View Unavailable</h3>
            <p className="text-slate-400 mb-6">WebGL is not supported or enabled in your browser. The 3D digital twin requires WebGL to render.</p>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-300 mb-2 font-medium">Active Alerts:</p>
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between text-sm bg-slate-700/50 rounded px-3 py-2">
                    <span className="text-slate-200">{alert.locationName}</span>
                    <span className={`font-semibold ${alert.type === 'moisture' ? 'text-red-400' : 'text-orange-400'}`}>
                      {alert.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 cursor-grab"
      />
      
      {/* Alert Markers Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {markerPositions.map((pos, idx) => {
          const alert = alerts[idx];
          if (!pos.visible) return null;
          
          return (
            <AlertMarker
              key={alert.id}
              position={pos}
              type={alert.type}
              isActive={selectedAlert?.id === alert.id}
              onClick={(e) => {
                e.stopPropagation();
                handleAlertClick(alert, pos);
              }}
            />
          );
        })}
        
        {/* Alert Tooltip */}
        {selectedAlert && (
          <AlertTooltip 
            alert={selectedAlert}
            position={tooltipPosition}
            onClose={() => setSelectedAlert(null)}
          />
        )}
      </div>
      
      {/* View Controls */}
      <ViewControls 
        activeView={activeView}
        onViewChange={setActiveView}
        onZoom={handleZoom}
      />
      
      {/* Component Properties Panel */}
      {selectedComponent && (
        <ComponentPropertiesPanel
          component={selectedComponent}
          onClose={() => {
            if (selectedComponentRef.current) {
              selectedComponentRef.current.material.emissive.setHex(0x000000);
            }
            setSelectedComponent(null);
          }}
        />
      )}
      
      {/* Panel Detail View */}
      {selectedPanel && !selectedSensor && (
        <PanelDetailView
          panel={selectedPanel}
          sensors={sensors.filter(s => s.panel_id === selectedPanel.panel_id)}
          onClose={() => {
            setSelectedPanel(null);
          }}
          onSensorClick={(sensor) => {
            setSelectedSensor(sensor);
          }}
        />
      )}
      
      {/* Sensor Action Modal */}
      {selectedSensor && (
        <SensorActionModal
          sensor={selectedSensor}
          panel={selectedPanel}
          onClose={() => {
            setSelectedSensor(null);
          }}
          onPing={(sensor) => {
            setPingingPanelId(sensor.panel_id);
            setTimeout(() => setPingingPanelId(null), 2000);
          }}
        />
      )}
      
      {/* Instructions */}
      {!selectedComponent && !selectedAlert && !selectedPanel && !selectedSensor && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-600/50 pointer-events-none">
          <p className="text-slate-300 text-sm flex items-center gap-2">
            <span className="text-blue-400">💡</span>
            Drag to rotate • Scroll to zoom • Click panels/sensors for details
          </p>
        </div>
      )}
    </div>
  );
}