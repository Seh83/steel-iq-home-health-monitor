import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import AlertTooltip from './AlertTooltip';
import ViewControls from './ViewControls';
import ComponentPropertiesPanel from './ComponentPropertiesPanel';
import PanelDetailView from '../panels/PanelDetailView';
import SensorActionModal from '../sensors/SensorActionModal';

// Warehouse building generator - detailed structural steel warehouse with gabled roof
function createWarehouse() {
  const group = new THREE.Group();
  const components = []; // Track all selectable structural components

  // --- Materials ---
  const steelMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b7d8e,
    metalness: 0.85,
    roughness: 0.25,
  });

  const steelDark = new THREE.MeshStandardMaterial({
    color: 0x4a5a6a,
    metalness: 0.9,
    roughness: 0.2,
  });

  const basePlateMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a6a7a,
    metalness: 0.95,
    roughness: 0.15,
  });

  const corrugatedWall = new THREE.MeshStandardMaterial({
    color: 0xcdd5dc,
    metalness: 0.55,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });

  const corrugatedRoof = new THREE.MeshStandardMaterial({
    color: 0xb8c4ce,
    metalness: 0.65,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });

  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d5a80,
    metalness: 0.7,
    roughness: 0.3,
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.92,
    metalness: 0.08,
  });

  const doorFrameMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d5a80,
    metalness: 0.8,
    roughness: 0.25,
  });

  // --- Helpers ---
  const addComponent = (geometry, material, position, type, componentId, rotation, additionalData = {}) => {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(...position);
    if (rotation) {
      if (rotation[0]) mesh.rotation.x = rotation[0];
      if (rotation[1]) mesh.rotation.y = rotation[1];
      if (rotation[2]) mesh.rotation.z = rotation[2];
    }
    mesh.userData = {
      id: componentId,
      type,
      material: additionalData.materialName || 'Steel W-Section',
      position: { x: position[0], y: position[1], z: position[2] },
      selectable: true,
      ...additionalData,
    };
    group.add(mesh);
    components.push(mesh);
    return mesh;
  };

  const addDecor = (geometry, material, position, rotation) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (rotation) {
      if (rotation[0]) mesh.rotation.x = rotation[0];
      if (rotation[1]) mesh.rotation.y = rotation[1];
      if (rotation[2]) mesh.rotation.z = rotation[2];
    }
    group.add(mesh);
    return mesh;
  };

  // Create an I-beam cross-section extruded along Y axis
  const createIBeamGeometry = (flangeW, flangeT, webH, webT, length) => {
    const shape = new THREE.Shape();
    const hw = flangeW / 2;
    const hh = (webH + 2 * flangeT) / 2;
    const hwt = webT / 2;
    // Bottom flange
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, -hh + flangeT);
    shape.lineTo(hwt, -hh + flangeT);
    // Web
    shape.lineTo(hwt, hh - flangeT);
    // Top flange
    shape.lineTo(hw, hh - flangeT);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.lineTo(-hw, hh - flangeT);
    shape.lineTo(-hwt, hh - flangeT);
    // Web other side
    shape.lineTo(-hwt, -hh + flangeT);
    shape.lineTo(-hw, -hh + flangeT);
    shape.lineTo(-hw, -hh);

    const extrudeSettings = { steps: 1, depth: length, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  };

  // --- Dimensions ---
  const W = 20;        // warehouse width (X)
  const D = 15;        // warehouse depth (Z)
  const eaveH = 6;     // eave height (wall height)
  const ridgeH = 3;    // extra height from eave to ridge
  const apexH = eaveH + ridgeH; // total ridge height
  const baySpacing = 5; // spacing along Z between frames
  const colSize = 0.2;  // column flange width visual
  const beamS = 0.12;   // beam/purlin size

  // Number of bays along depth
  const numBaysZ = Math.round(D / baySpacing);

  // --- Concrete floor slab ---
  addDecor(
    new THREE.BoxGeometry(W + 0.4, 0.25, D + 0.4),
    floorMaterial,
    [0, -0.125, 0],
    null
  );

  // Floor markings (subtle grid lines)
  for (let x = -W / 2 + baySpacing; x < W / 2; x += baySpacing) {
    addDecor(
      new THREE.BoxGeometry(0.02, 0.005, D),
      new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 }),
      [x, 0.005, 0],
      null
    );
  }
  for (let z = -D / 2 + baySpacing; z < D / 2; z += baySpacing) {
    addDecor(
      new THREE.BoxGeometry(W, 0.005, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 }),
      [0, 0.005, z],
      null
    );
  }

  // =====================================================
  // STRUCTURAL STEEL FRAME
  // =====================================================

  let colCounter = 1;
  let pbCounter = 1;
  let rtCounter = 1;
  let purlinCounter = 1;
  let girtCounter = 1;
  let braceCounter = 1;

  const defaultComponentData = (type, dims, weight, loadRating) => ({
    dimensions: dims,
    weight,
    loadRating,
    status: 'Good',
    sensors: type === 'Structural Column' ? 2 : 1,
    lastInspection: '2024-12-15',
    installDate: '2024-03-10',
    readings: [
      { label: 'Stress', value: `${(0.5 + Math.random() * 0.8).toFixed(2)} kN` },
      { label: 'Temp', value: `${Math.round(65 + Math.random() * 8)}°F` },
    ],
  });

  // --- Columns along perimeter at each bay ---
  // Only left (x = -W/2) and right (x = W/2) walls
  for (let zi = 0; zi <= numBaysZ; zi++) {
    const z = -D / 2 + zi * baySpacing;
    for (const x of [-W / 2, W / 2]) {
      const colId = `COL-${colCounter++}`;
      // Column: I-beam shape extruded upward
      const colGeom = createIBeamGeometry(colSize, 0.02, colSize - 0.04, 0.02, eaveH);
      const col = addComponent(
        colGeom,
        steelMaterial,
        [x, 0, z],
        'Structural Column',
        colId,
        null,
        defaultComponentData('Structural Column', `W8x31 (${colSize}m flange, ${eaveH}m tall)`, '285 kg', '2500 kN')
      );
      // Rotate so extrusion goes upward (extruded along +Z by default, we want +Y)
      col.rotation.x = -Math.PI / 2;
      col.position.y = 0;

      // Base plate
      addDecor(
        new THREE.BoxGeometry(colSize * 2, 0.04, colSize * 2),
        basePlateMaterial,
        [x, 0.02, z],
        null
      );
      // Anchor bolts (4 small cylinders)
      for (const dx of [-1, 1]) {
        for (const dz of [-1, 1]) {
          addDecor(
            new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8),
            basePlateMaterial,
            [x + dx * colSize * 0.7, 0.07, z + dz * colSize * 0.7],
            null
          );
        }
      }
    }
  }

  // --- Eave beams (top of wall, along Z on left and right sides) ---
  for (let zi = 0; zi < numBaysZ; zi++) {
    const z0 = -D / 2 + zi * baySpacing;
    const zMid = z0 + baySpacing / 2;
    for (const x of [-W / 2, W / 2]) {
      const side = x < 0 ? 'L' : 'R';
      addComponent(
        new THREE.BoxGeometry(beamS, beamS, baySpacing),
        steelMaterial,
        [x, eaveH, zMid],
        'Eave Beam',
        `EB-${side}${pbCounter}`,
        null,
        defaultComponentData('Eave Beam', `${baySpacing}m x ${beamS}m x ${beamS}m`, '180 kg', '1800 kN')
      );
    }
    pbCounter++;
  }

  // --- Eave beams along X (front and back walls at eave height) ---
  let eaveFBCounter = 1;
  for (const z of [-D / 2, D / 2]) {
    const side = z < 0 ? 'F' : 'B';
    addComponent(
      new THREE.BoxGeometry(W, beamS, beamS),
      steelMaterial,
      [0, eaveH, z],
      'Perimeter Beam',
      `PB-${side}${eaveFBCounter++}`,
      null,
      defaultComponentData('Perimeter Beam', `${W}m x ${beamS}m x ${beamS}m`, '340 kg', '1800 kN')
    );
  }

  // --- Gabled Roof Trusses (at each bay line along Z) ---
  // Each truss = two sloped rafters + bottom chord + vertical king post + diagonal web members
  const rafterLen = Math.sqrt((W / 2) ** 2 + ridgeH ** 2);
  const rafterAngle = Math.atan2(ridgeH, W / 2);

  for (let zi = 0; zi <= numBaysZ; zi++) {
    const z = -D / 2 + zi * baySpacing;
    const trussId = `RT-${rtCounter++}`;

    // Left rafter (from left eave up to ridge)
    addComponent(
      new THREE.BoxGeometry(rafterLen, beamS, beamS),
      steelDark,
      [-W / 4, eaveH + ridgeH / 2, z],
      'Roof Rafter',
      `RR-L${zi + 1}`,
      [0, 0, rafterAngle],
      defaultComponentData('Roof Rafter', `${rafterLen.toFixed(1)}m rafter`, '210 kg', '2000 kN')
    );

    // Right rafter
    addComponent(
      new THREE.BoxGeometry(rafterLen, beamS, beamS),
      steelDark,
      [W / 4, eaveH + ridgeH / 2, z],
      'Roof Rafter',
      `RR-R${zi + 1}`,
      [0, 0, -rafterAngle],
      defaultComponentData('Roof Rafter', `${rafterLen.toFixed(1)}m rafter`, '210 kg', '2000 kN')
    );

    // Bottom chord (horizontal tie beam at eave level connecting columns)
    addComponent(
      new THREE.BoxGeometry(W, beamS * 0.8, beamS * 0.8),
      steelMaterial,
      [0, eaveH + beamS, z],
      'Roof Truss',
      trussId,
      null,
      defaultComponentData('Roof Truss', `${W}m bottom chord`, '320 kg', '2200 kN')
    );

    // King post (vertical from bottom chord to ridge)
    addDecor(
      new THREE.BoxGeometry(beamS * 0.6, ridgeH, beamS * 0.6),
      steelDark.clone(),
      [0, eaveH + ridgeH / 2, z],
      null
    );

    // Diagonal web members (queen posts) - 2 per side
    for (const side of [-1, 1]) {
      // Inner diagonal: from bottom chord at W/4 up to ridge
      const diagX = side * W / 4;
      const diagLen = Math.sqrt((W / 4) ** 2 + ridgeH ** 2);
      const diagAngle = Math.atan2(ridgeH, W / 4) * side;
      addDecor(
        new THREE.BoxGeometry(diagLen, beamS * 0.5, beamS * 0.5),
        steelDark.clone(),
        [diagX / 2, eaveH + ridgeH / 2, z],
        [0, 0, diagAngle]
      );

      // Vertical web at quarter point
      addDecor(
        new THREE.BoxGeometry(beamS * 0.5, ridgeH / 2, beamS * 0.5),
        steelDark.clone(),
        [diagX, eaveH + ridgeH / 4, z],
        null
      );
    }
  }

  // --- Ridge beam (runs full length at apex) ---
  addComponent(
    new THREE.BoxGeometry(beamS * 1.2, beamS * 1.2, D),
    steelDark,
    [0, apexH, 0],
    'Ridge Beam',
    'RB-1',
    null,
    {
      ...defaultComponentData('Ridge Beam', `${D}m x ${(beamS * 1.2).toFixed(2)}m`, '380 kg', '2400 kN'),
      materialName: 'Steel W-Section',
    }
  );

  // --- Purlins (run along Z on each roof slope) ---
  const numPurlinsPerSide = 3;
  for (let pi = 1; pi <= numPurlinsPerSide; pi++) {
    const frac = pi / (numPurlinsPerSide + 1);
    const px = (W / 2) * frac;
    const py = eaveH + ridgeH * frac;

    for (const side of [-1, 1]) {
      addComponent(
        new THREE.BoxGeometry(beamS * 0.7, beamS * 0.7, D),
        steelMaterial,
        [side * px, py, 0],
        'Roof Purlin',
        `PUR-${side < 0 ? 'L' : 'R'}${purlinCounter}`,
        null,
        defaultComponentData('Roof Purlin', `${D}m C-purlin`, '45 kg', '600 kN')
      );
      purlinCounter++;
    }
  }

  // --- Girts (horizontal wall framing on side walls) ---
  const girtHeights = [1.5, 3.0, 4.5];
  for (const gy of girtHeights) {
    for (let zi = 0; zi < numBaysZ; zi++) {
      const z0 = -D / 2 + zi * baySpacing;
      const zMid = z0 + baySpacing / 2;
      for (const x of [-W / 2, W / 2]) {
        const side = x < 0 ? 'L' : 'R';
        addComponent(
          new THREE.BoxGeometry(beamS * 0.6, beamS * 0.6, baySpacing),
          steelMaterial,
          [x, gy, zMid],
          'Wall Girt',
          `GRT-${side}${girtCounter++}`,
          null,
          defaultComponentData('Wall Girt', `${baySpacing}m C-girt`, '35 kg', '400 kN')
        );
      }
    }
  }

  // --- Cross-bracing on end bays of side walls ---
  for (const zi of [0, numBaysZ - 1]) {
    const z0 = -D / 2 + zi * baySpacing;
    const z1 = z0 + baySpacing;
    const braceLen = Math.sqrt(baySpacing ** 2 + eaveH ** 2);

    for (const x of [-W / 2, W / 2]) {
      // X-brace: two diagonal rods
      const brace1 = addComponent(
        new THREE.CylinderGeometry(0.02, 0.02, braceLen, 6),
        steelDark,
        [x, eaveH / 2, (z0 + z1) / 2],
        'Wall Bracing',
        `BR-${braceCounter++}`,
        null,
        defaultComponentData('Wall Bracing', `${braceLen.toFixed(1)}m rod`, '25 kg', '300 kN')
      );
      const braceAngle1 = Math.atan2(eaveH, baySpacing);
      brace1.rotation.x = braceAngle1;
      if (x > 0) brace1.rotation.y = Math.PI;

      const brace2 = addComponent(
        new THREE.CylinderGeometry(0.02, 0.02, braceLen, 6),
        steelDark,
        [x, eaveH / 2, (z0 + z1) / 2],
        'Wall Bracing',
        `BR-${braceCounter++}`,
        null,
        defaultComponentData('Wall Bracing', `${braceLen.toFixed(1)}m rod`, '25 kg', '300 kN')
      );
      brace2.rotation.x = -braceAngle1;
      if (x > 0) brace2.rotation.y = Math.PI;
    }
  }

  // --- Cross-bracing in roof plane (end bays) ---
  for (const zi of [0, numBaysZ - 1]) {
    const z0 = -D / 2 + zi * baySpacing;
    const z1 = z0 + baySpacing;
    const roofBraceLen = Math.sqrt((W / 2) ** 2 + baySpacing ** 2);

    for (const side of [-1, 1]) {
      const cx = side * W / 4;
      const midY = eaveH + ridgeH / 2;
      const midZ = (z0 + z1) / 2;

      addDecor(
        new THREE.CylinderGeometry(0.015, 0.015, roofBraceLen, 6),
        steelDark.clone(),
        [cx, midY, midZ],
        [Math.atan2(baySpacing, 0), 0, Math.PI / 2]
      );
    }
  }

  // =====================================================
  // CLADDING / PANELS
  // =====================================================

  // --- Side wall panels (left and right) ---
  for (const x of [-W / 2, W / 2]) {
    const wallMesh = addDecor(
      new THREE.PlaneGeometry(D, eaveH),
      corrugatedWall.clone(),
      [x, eaveH / 2, 0],
      [0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]
    );
    // Add slight offset so panels sit outside the frame
    wallMesh.position.x += (x < 0 ? -0.05 : 0.05);
  }

  // --- Front wall (with roll-up door opening) ---
  const doorW = 6;
  const doorH = 5;
  const frontZ = -D / 2 - 0.05;

  // Left of door
  addDecor(
    new THREE.PlaneGeometry((W - doorW) / 2, eaveH),
    corrugatedWall.clone(),
    [-(W + doorW) / 4, eaveH / 2, frontZ],
    null
  );
  // Right of door
  addDecor(
    new THREE.PlaneGeometry((W - doorW) / 2, eaveH),
    corrugatedWall.clone(),
    [(W + doorW) / 4, eaveH / 2, frontZ],
    null
  );
  // Above door
  addDecor(
    new THREE.PlaneGeometry(doorW, eaveH - doorH),
    corrugatedWall.clone(),
    [0, eaveH - (eaveH - doorH) / 2, frontZ],
    null
  );
  // Front gable (triangle above eave)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-W / 2, 0);
  gableShape.lineTo(W / 2, 0);
  gableShape.lineTo(0, ridgeH);
  gableShape.lineTo(-W / 2, 0);
  const frontGable = addDecor(
    new THREE.ShapeGeometry(gableShape),
    corrugatedWall.clone(),
    [0, eaveH, frontZ],
    null
  );

  // --- Door frame ---
  const frameThick = 0.12;
  const frameDepth = 0.15;
  // Left jamb
  addDecor(
    new THREE.BoxGeometry(frameThick, doorH, frameDepth),
    doorFrameMaterial.clone(),
    [-doorW / 2, doorH / 2, -D / 2],
    null
  );
  // Right jamb
  addDecor(
    new THREE.BoxGeometry(frameThick, doorH, frameDepth),
    doorFrameMaterial.clone(),
    [doorW / 2, doorH / 2, -D / 2],
    null
  );
  // Header
  addDecor(
    new THREE.BoxGeometry(doorW + frameThick * 2, frameThick, frameDepth),
    doorFrameMaterial.clone(),
    [0, doorH + frameThick / 2, -D / 2],
    null
  );
  // Door track guides (thin rails)
  for (const dx of [-1, 1]) {
    addDecor(
      new THREE.BoxGeometry(0.03, doorH, 0.04),
      basePlateMaterial.clone(),
      [dx * (doorW / 2 - 0.15), doorH / 2, -D / 2 + 0.05],
      null
    );
  }

  // --- Back wall ---
  addDecor(
    new THREE.PlaneGeometry(W, eaveH),
    corrugatedWall.clone(),
    [0, eaveH / 2, D / 2 + 0.05],
    [0, Math.PI, 0]
  );
  // Back gable
  addDecor(
    new THREE.ShapeGeometry(gableShape),
    corrugatedWall.clone(),
    [0, eaveH, D / 2 + 0.05],
    [0, Math.PI, 0]
  );

  // --- Sloped roof panels ---
  const roofSlope = Math.sqrt((W / 2) ** 2 + ridgeH ** 2);
  // Left slope
  const leftRoof = addDecor(
    new THREE.PlaneGeometry(roofSlope, D + 0.3),
    corrugatedRoof.clone(),
    [-W / 4, eaveH + ridgeH / 2, 0],
    [0, 0, rafterAngle]
  );
  leftRoof.rotation.order = 'YXZ';
  leftRoof.rotation.set(0, 0, rafterAngle);
  leftRoof.position.set(-W / 4, eaveH + ridgeH / 2, 0);

  // Right slope
  const rightRoof = addDecor(
    new THREE.PlaneGeometry(roofSlope, D + 0.3),
    corrugatedRoof.clone(),
    [W / 4, eaveH + ridgeH / 2, 0],
    null
  );
  rightRoof.rotation.order = 'YXZ';
  rightRoof.rotation.set(0, 0, -rafterAngle);
  rightRoof.position.set(W / 4, eaveH + ridgeH / 2, 0);

  // --- Eave trim / fascia (along the bottom edge of roof on both sides) ---
  for (const side of [-1, 1]) {
    addDecor(
      new THREE.BoxGeometry(0.08, 0.3, D + 0.4),
      trimMaterial.clone(),
      [side * W / 2, eaveH + 0.15, 0],
      null
    );
  }
  // Ridge cap
  addDecor(
    new THREE.BoxGeometry(0.15, 0.08, D + 0.4),
    trimMaterial.clone(),
    [0, apexH + 0.04, 0],
    null
  );

  // --- Downspouts and gutters (subtle detail) ---
  for (const x of [-W / 2, W / 2]) {
    for (const z of [-D / 2, D / 2]) {
      // Gutter bracket at corner
      addDecor(
        new THREE.CylinderGeometry(0.04, 0.04, eaveH, 8),
        trimMaterial.clone(),
        [x + (x < 0 ? 0.06 : -0.06), eaveH / 2, z + (z < 0 ? 0.06 : -0.06)],
        null
      );
    }
  }

  // --- Small personnel door on right side wall ---
  const personnelDoorW = 1.0;
  const personnelDoorH = 2.2;
  const personnelDoorZ = -D / 2 + 2;
  // Cut visual: slightly recessed dark rectangle
  addDecor(
    new THREE.PlaneGeometry(personnelDoorW, personnelDoorH),
    new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.6, roughness: 0.4 }),
    [W / 2 + 0.06, personnelDoorH / 2, personnelDoorZ],
    [0, -Math.PI / 2, 0]
  );
  // Door frame
  addDecor(
    new THREE.BoxGeometry(0.05, personnelDoorH + 0.1, frameDepth),
    doorFrameMaterial.clone(),
    [W / 2 + 0.02, personnelDoorH / 2, personnelDoorZ - personnelDoorW / 2],
    [0, 0, 0]
  );
  addDecor(
    new THREE.BoxGeometry(0.05, personnelDoorH + 0.1, frameDepth),
    doorFrameMaterial.clone(),
    [W / 2 + 0.02, personnelDoorH / 2, personnelDoorZ + personnelDoorW / 2],
    [0, 0, 0]
  );

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