import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import AlertTooltip from './AlertTooltip';
import ViewControls from './ViewControls';

// Steel frame building generator
function createSteelFrame() {
  const group = new THREE.Group();
  const steelMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4a5568,
    metalness: 0.8,
    roughness: 0.3,
    transparent: true,
    opacity: 0.9
  });

  // Helper to create a steel beam
  const createBeam = (width, height, depth) => {
    return new THREE.BoxGeometry(width, height, depth);
  };

  // Floor dimensions
  const floorWidth = 12;
  const floorDepth = 8;
  const wallHeight = 4;
  const studSpacing = 1.2;
  const beamSize = 0.08;

  // Create floor frame
  const floorBeams = [
    { pos: [0, 0, -floorDepth/2], size: [floorWidth, beamSize, beamSize] },
    { pos: [0, 0, floorDepth/2], size: [floorWidth, beamSize, beamSize] },
    { pos: [-floorWidth/2, 0, 0], size: [beamSize, beamSize, floorDepth] },
    { pos: [floorWidth/2, 0, 0], size: [beamSize, beamSize, floorDepth] },
  ];

  // Floor joists
  for (let x = -floorWidth/2 + studSpacing; x < floorWidth/2; x += studSpacing) {
    floorBeams.push({ pos: [x, 0, 0], size: [beamSize, beamSize, floorDepth] });
  }

  floorBeams.forEach(beam => {
    const geometry = createBeam(...beam.size);
    const mesh = new THREE.Mesh(geometry, steelMaterial);
    mesh.position.set(...beam.pos);
    group.add(mesh);
  });

  // Wall studs - Front and Back
  for (let x = -floorWidth/2; x <= floorWidth/2; x += studSpacing) {
    // Front wall
    const frontStud = new THREE.Mesh(createBeam(beamSize, wallHeight, beamSize), steelMaterial);
    frontStud.position.set(x, wallHeight/2, -floorDepth/2);
    group.add(frontStud);

    // Back wall
    const backStud = new THREE.Mesh(createBeam(beamSize, wallHeight, beamSize), steelMaterial);
    backStud.position.set(x, wallHeight/2, floorDepth/2);
    group.add(backStud);
  }

  // Wall studs - Left and Right
  for (let z = -floorDepth/2 + studSpacing; z < floorDepth/2; z += studSpacing) {
    // Left wall
    const leftStud = new THREE.Mesh(createBeam(beamSize, wallHeight, beamSize), steelMaterial);
    leftStud.position.set(-floorWidth/2, wallHeight/2, z);
    group.add(leftStud);

    // Right wall
    const rightStud = new THREE.Mesh(createBeam(beamSize, wallHeight, beamSize), steelMaterial);
    rightStud.position.set(floorWidth/2, wallHeight/2, z);
    group.add(rightStud);
  }

  // Top plates
  const topPlates = [
    { pos: [0, wallHeight, -floorDepth/2], size: [floorWidth, beamSize, beamSize] },
    { pos: [0, wallHeight, floorDepth/2], size: [floorWidth, beamSize, beamSize] },
    { pos: [-floorWidth/2, wallHeight, 0], size: [beamSize, beamSize, floorDepth] },
    { pos: [floorWidth/2, wallHeight, 0], size: [beamSize, beamSize, floorDepth] },
  ];

  topPlates.forEach(beam => {
    const geometry = createBeam(...beam.size);
    const mesh = new THREE.Mesh(geometry, steelMaterial);
    mesh.position.set(...beam.pos);
    group.add(mesh);
  });

  // Roof rafters (gable style)
  const roofPeak = 2;
  const roofRafterMaterial = steelMaterial.clone();
  
  for (let x = -floorWidth/2; x <= floorWidth/2; x += studSpacing * 1.5) {
    // Left slope
    const leftRafter = new THREE.Mesh(
      createBeam(beamSize, Math.sqrt(roofPeak*roofPeak + (floorDepth/2)*(floorDepth/2)), beamSize),
      roofRafterMaterial
    );
    leftRafter.position.set(x, wallHeight + roofPeak/2, -floorDepth/4);
    leftRafter.rotation.x = Math.atan2(roofPeak, floorDepth/2);
    group.add(leftRafter);

    // Right slope
    const rightRafter = new THREE.Mesh(
      createBeam(beamSize, Math.sqrt(roofPeak*roofPeak + (floorDepth/2)*(floorDepth/2)), beamSize),
      roofRafterMaterial
    );
    rightRafter.position.set(x, wallHeight + roofPeak/2, floorDepth/4);
    rightRafter.rotation.x = -Math.atan2(roofPeak, floorDepth/2);
    group.add(rightRafter);
  }

  // Ridge beam
  const ridge = new THREE.Mesh(createBeam(floorWidth, beamSize, beamSize), steelMaterial);
  ridge.position.set(0, wallHeight + roofPeak, 0);
  group.add(ridge);

  // Interior walls (partial)
  for (let z = -floorDepth/4; z <= floorDepth/4; z += studSpacing) {
    const interiorStud = new THREE.Mesh(createBeam(beamSize, wallHeight * 0.9, beamSize), steelMaterial);
    interiorStud.position.set(-2, wallHeight * 0.45, z);
    group.add(interiorStud);
  }

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

export default function DigitalTwinViewer({ alerts }) {
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

    // Steel frame
    const steelFrame = createSteelFrame();
    steelFrame.position.y = 0.1;
    scene.add(steelFrame);
    frameRef.current = steelFrame;

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

    // Animation
    let angle = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Slow rotation
      angle += 0.001;
      camera.position.x = 18 * Math.cos(angle);
      camera.position.z = 18 * Math.sin(angle);
      camera.lookAt(0, 2, 0);
      
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
      if (renderer && container.contains(renderer.domElement)) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

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
    }
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
        className="absolute inset-0"
        onClick={() => setSelectedAlert(null)}
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
    </div>
  );
}