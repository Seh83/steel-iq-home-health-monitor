import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import AlertTooltip from './AlertTooltip';
import ViewControls from './ViewControls';
import ComponentPropertiesPanel from './ComponentPropertiesPanel';
import PanelDetailView from '../panels/PanelDetailView';
import SensorActionModal from '../sensors/SensorActionModal';

// Residential house building generator - visible framing structure
function createWarehouse() {
  const group = new THREE.Group();
  const components = [];

  // ── Materials ──────────────────────────────────────────────────────
  const framingMat = new THREE.MeshStandardMaterial({
    color: 0x5a6e7f,
    metalness: 0.3,
    roughness: 0.7,
  });

  const wallPanelMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a5a,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });

  const roofPanelMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a4a,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x404040,
    roughness: 0.9,
    metalness: 0.1,
  });

  const edgeLineMat = new THREE.LineBasicMaterial({
    color: 0x6a7a8a,
    transparent: true,
    opacity: 0.6,
  });

  // ── Dimensions ────────────────────────────────────────────────────
  const W = 16;
  const D = 12;
  const eaveH = 5;
  const ridgeH = 3;
  const apexH = eaveH + ridgeH;
  const bay = 2;
  const numBays = Math.round(D / bay);
  const bS = 0.1;  // beam cross-section size

  // ── Helpers ───────────────────────────────────────────────────────
  const componentData = (type, dims, weight, loadRating) => ({
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

  const addSteel = (geo, mat, pos, type, id, data, rot = null) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      id,
      type,
      material: 'Steel W-Section',
      position: { x: pos[0], y: pos[1], z: pos[2] },
      selectable: true,
      ...data,
    };
    group.add(mesh);
    components.push(mesh);

    // Edge wireframe for crisp look
    const edges = new THREE.EdgesGeometry(geo, 20);
    const line = new THREE.LineSegments(edges, edgeLineMat);
    mesh.add(line);

    return mesh;
  };

  // Add non-selectable decoration
  const addDecor = (geo, mat, pos, rot) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Build a quad from 4 corners (for roof panels, gables)
  const makeQuadGeo = (a, b, c, d) => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2],
      a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2],
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  };

  // Build a triangle from 3 corners
  const makeTriGeo = (a, b, c) => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  };

  // Create a line between two 3D points
  const addLine = (p1, p2, mat) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1[0], p1[1], p1[2]),
      new THREE.Vector3(p2[0], p2[1], p2[2]),
    ]);
    const line = new THREE.Line(geo, mat);
    group.add(line);
    return line;
  };

  // Create rod between two points (for bracing)
  const addRod = (p1, p2, radius, mat) => {
    const start = new THREE.Vector3(p1[0], p1[1], p1[2]);
    const end = new THREE.Vector3(p2[0], p2[1], p2[2]);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(radius, radius, len, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  // ── Floor ─────────────────────────────────────────────────────────
  addDecor(
    new THREE.BoxGeometry(W + 0.6, 0.2, D + 0.6),
    floorMat,
    [0, -0.1, 0]
  );

  // Subtle floor grid
  const gridMat = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.15 });
  for (let x = -W / 2; x <= W / 2; x += bay) {
    addLine([x, 0.01, -D / 2], [x, 0.01, D / 2], gridMat);
  }
  for (let z = -D / 2; z <= D / 2; z += bay) {
    addLine([-W / 2, 0.01, z], [W / 2, 0.01, z], gridMat);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STRUCTURAL STEEL FRAME
  // ═══════════════════════════════════════════════════════════════════

  let colN = 1, ebN = 1, rtN = 1, rrN = 1, purN = 1, grtN = 1, brN = 1;

  // ── Columns ───────────────────────────────────────────────────────
  for (let zi = 0; zi <= numBays; zi++) {
    const z = -D / 2 + zi * bay;
    for (const x of [-W / 2, W / 2]) {
      addSteel(
        new THREE.BoxGeometry(bS, eaveH, bS),
        steelPrimary,
        [x, eaveH / 2, z],
        'Structural Column',
        `COL-${colN++}`,
        componentData('Structural Column', `W8x31 (${bS}m x ${eaveH}m)`, '285 kg', '2500 kN')
      );

      // Base plate
      addDecor(
        new THREE.BoxGeometry(bS * 2.5, 0.05, bS * 2.5),
        steelAccent,
        [x, 0.025, z]
      );
    }
  }

  // ── Eave beams (side walls, along Z) ──────────────────────────────
  for (let zi = 0; zi < numBays; zi++) {
    const zMid = -D / 2 + zi * bay + bay / 2;
    for (const x of [-W / 2, W / 2]) {
      const side = x < 0 ? 'L' : 'R';
      addSteel(
        new THREE.BoxGeometry(bS * 0.9, bS * 0.9, bay),
        steelPrimary,
        [x, eaveH, zMid],
        'Eave Beam',
        `EB-${side}${ebN++}`,
        componentData('Eave Beam', `${bay}m x ${bS}m`, '180 kg', '1800 kN')
      );
    }
  }

  // ── Perimeter beams (front & back, along X) ──────────────────────
  for (const z of [-D / 2, D / 2]) {
    const side = z < 0 ? 'F' : 'B';
    addSteel(
      new THREE.BoxGeometry(W, bS * 0.9, bS * 0.9),
      steelPrimary,
      [0, eaveH, z],
      'Perimeter Beam',
      `PB-${side}1`,
      componentData('Perimeter Beam', `${W}m x ${bS}m`, '340 kg', '1800 kN')
    );
  }

  // ── Roof trusses at each bay line ─────────────────────────────────
  const rafterLen = Math.sqrt((W / 2) ** 2 + ridgeH ** 2);
  const rafterAngle = Math.atan2(ridgeH, W / 2);

  for (let zi = 0; zi <= numBays; zi++) {
    const z = -D / 2 + zi * bay;

    // Left rafter
    addSteel(
      new THREE.BoxGeometry(rafterLen, bS, bS),
      steelAccent,
      [-W / 4, eaveH + ridgeH / 2, z],
      'Roof Rafter',
      `RR-L${rrN}`,
      componentData('Roof Rafter', `${rafterLen.toFixed(1)}m rafter`, '210 kg', '2000 kN'),
      [0, 0, rafterAngle]
    );

    // Right rafter
    addSteel(
      new THREE.BoxGeometry(rafterLen, bS, bS),
      steelAccent,
      [W / 4, eaveH + ridgeH / 2, z],
      'Roof Rafter',
      `RR-R${rrN++}`,
      componentData('Roof Rafter', `${rafterLen.toFixed(1)}m rafter`, '210 kg', '2000 kN'),
      [0, 0, -rafterAngle]
    );

    // Bottom chord
    addSteel(
      new THREE.BoxGeometry(W, bS * 0.7, bS * 0.7),
      steelPrimary,
      [0, eaveH + bS * 0.5, z],
      'Roof Truss',
      `RT-${rtN++}`,
      componentData('Roof Truss', `${W}m bottom chord`, '320 kg', '2200 kN')
    );

    // King post
    addDecor(
      new THREE.BoxGeometry(bS * 0.6, ridgeH, bS * 0.6),
      steelAccent,
      [0, eaveH + ridgeH / 2, z]
    );

    // Diagonal web members
    for (const side of [-1, 1]) {
      const diagX = side * W / 4;
      const diagLen = Math.sqrt((W / 4) ** 2 + ridgeH ** 2);
      const diagAngle = Math.atan2(ridgeH, W / 4) * side;
      addDecor(
        new THREE.BoxGeometry(diagLen, bS * 0.5, bS * 0.5),
        steelAccent,
        [diagX / 2, eaveH + ridgeH / 2, z],
        [0, 0, diagAngle]
      );
      addDecor(
        new THREE.BoxGeometry(bS * 0.5, ridgeH / 2, bS * 0.5),
        steelAccent,
        [diagX, eaveH + ridgeH / 4, z]
      );
    }

    // Gusset plates
    for (const s of [-1, 1]) {
      const gussetShape = new THREE.Shape();
      gussetShape.moveTo(0, 0);
      gussetShape.lineTo(s * 0.6, 0);
      gussetShape.lineTo(0, 0.6);
      gussetShape.lineTo(0, 0);
      const gussetGeo = new THREE.ExtrudeGeometry(gussetShape, { depth: bS * 0.3, bevelEnabled: false });
      const gusset = new THREE.Mesh(gussetGeo, steelAccent);
      gusset.position.set(s * W / 2, eaveH, z);
      gusset.position.z -= bS * 0.15;
      group.add(gusset);
    }
  }

  // ── Ridge beam ────────────────────────────────────────────────────
  addSteel(
    new THREE.BoxGeometry(bS * 1.2, bS * 1.2, D),
    steelAccent,
    [0, apexH, 0],
    'Ridge Beam',
    'RB-1',
    componentData('Ridge Beam', `${D}m x ${(bS * 1.2).toFixed(2)}m`, '380 kg', '2400 kN')
  );

  // ── Purlins (3 per slope, run along Z) ────────────────────────────
  for (let pi = 1; pi <= 3; pi++) {
    const frac = pi / 4;
    const px = (W / 2) * frac;
    const py = eaveH + ridgeH * frac;
    for (const s of [-1, 1]) {
      addSteel(
        new THREE.BoxGeometry(bS * 0.6, bS * 0.6, D),
        steelPrimary,
        [s * px, py, 0],
        'Roof Purlin',
        `PUR-${s < 0 ? 'L' : 'R'}${purN++}`,
        componentData('Roof Purlin', `${D}m C-purlin`, '45 kg', '600 kN')
      );
    }
  }

  // ── Girts (horizontal wall framing at 3 heights) ──────────────────
  for (const gy of [1.5, 3.0, 4.5]) {
    for (let zi = 0; zi < numBays; zi++) {
      const zMid = -D / 2 + zi * bay + bay / 2;
      for (const x of [-W / 2, W / 2]) {
        const side = x < 0 ? 'L' : 'R';
        addSteel(
          new THREE.BoxGeometry(bS * 0.5, bS * 0.5, bay),
          steelPrimary,
          [x, gy, zMid],
          'Wall Girt',
          `GRT-${side}${grtN++}`,
          componentData('Wall Girt', `${bay}m C-girt`, '35 kg', '400 kN')
        );
      }
    }
  }

  // ── Wall X-bracing (end bays) ─────────────────────────────────────
  for (const bi of [0, numBays - 1]) {
    const z0 = -D / 2 + bi * bay;
    const z1 = z0 + bay;
    for (const x of [-W / 2, W / 2]) {
      const r1 = addRod([x, 0, z0], [x, eaveH, z1], 0.02, steelAccent);
      r1.userData = {
        id: `BR-${brN}`, type: 'Wall Bracing', material: 'Steel Rod',
        position: { x, y: eaveH / 2, z: (z0 + z1) / 2 }, selectable: true,
        ...componentData('Wall Bracing', `${Math.sqrt(bay ** 2 + eaveH ** 2).toFixed(1)}m rod`, '25 kg', '300 kN'),
      };
      components.push(r1);
      brN++;

      const r2 = addRod([x, eaveH, z0], [x, 0, z1], 0.02, steelAccent);
      r2.userData = {
        id: `BR-${brN}`, type: 'Wall Bracing', material: 'Steel Rod',
        position: { x, y: eaveH / 2, z: (z0 + z1) / 2 }, selectable: true,
        ...componentData('Wall Bracing', `${Math.sqrt(bay ** 2 + eaveH ** 2).toFixed(1)}m rod`, '25 kg', '300 kN'),
      };
      components.push(r2);
      brN++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // CLADDING / PANELS
  // ═══════════════════════════════════════════════════════════════════

  const hD = D / 2;
  const hW = W / 2;
  const clad = 0.08;

  // ── Side walls ────────────────────────────────────────────────────
  const sideWallL = makeQuadGeo(
    [-hW - clad, 0, -hD], [-hW - clad, 0, hD],
    [-hW - clad, eaveH, hD], [-hW - clad, eaveH, -hD]
  );
  addDecor(sideWallL, wallPanelMat, [0, 0, 0]);

  const sideWallR = makeQuadGeo(
    [hW + clad, 0, -hD], [hW + clad, eaveH, -hD],
    [hW + clad, eaveH, hD], [hW + clad, 0, hD]
  );
  addDecor(sideWallR, wallPanelMat, [0, 0, 0]);

  // ── Front wall with door opening ──────────────────────────────────
  const doorW = 6;
  const doorH = 5;
  const doorHalf = doorW / 2;

  // Left of door
  addDecor(
    makeQuadGeo(
      [-hW, 0, -hD - clad], [-hW, eaveH, -hD - clad],
      [-doorHalf, eaveH, -hD - clad], [-doorHalf, 0, -hD - clad]
    ),
    wallPanelMat,
    [0, 0, 0]
  );

  // Right of door
  addDecor(
    makeQuadGeo(
      [doorHalf, 0, -hD - clad], [doorHalf, eaveH, -hD - clad],
      [hW, eaveH, -hD - clad], [hW, 0, -hD - clad]
    ),
    wallPanelMat,
    [0, 0, 0]
  );

  // Above door
  addDecor(
    makeQuadGeo(
      [-doorHalf, doorH, -hD - clad], [-doorHalf, eaveH, -hD - clad],
      [doorHalf, eaveH, -hD - clad], [doorHalf, doorH, -hD - clad]
    ),
    wallPanelMat,
    [0, 0, 0]
  );

  // Front gable (triangular)
  addDecor(
    makeTriGeo([0, apexH, -hD - clad], [-hW, eaveH, -hD - clad], [hW, eaveH, -hD - clad]),
    wallPanelMat,
    [0, 0, 0]
  );

  // ── Back wall ─────────────────────────────────────────────────────
  addDecor(
    makeQuadGeo(
      [-hW, 0, hD + clad], [hW, 0, hD + clad],
      [hW, eaveH, hD + clad], [-hW, eaveH, hD + clad]
    ),
    wallPanelMat,
    [0, 0, 0]
  );

  // Back gable
  addDecor(
    makeTriGeo([0, apexH, hD + clad], [hW, eaveH, hD + clad], [-hW, eaveH, hD + clad]),
    wallPanelMat,
    [0, 0, 0]
  );

  // ── Door frame ────────────────────────────────────────────────────
  const ft = 0.12;
  addDecor(new THREE.BoxGeometry(ft, doorH, 0.2), trimMat, [-doorHalf, doorH / 2, -hD]);
  addDecor(new THREE.BoxGeometry(ft, doorH, 0.2), trimMat, [doorHalf, doorH / 2, -hD]);
  addDecor(new THREE.BoxGeometry(doorW + ft * 2, ft, 0.2), trimMat, [0, doorH + ft / 2, -hD]);

  // ── Roof panels (proper vertex-positioned quads) ──────────────────
  const roofOverhang = 0.3;
  // Left slope
  addDecor(
    makeQuadGeo(
      [-hW - roofOverhang, eaveH, -hD - roofOverhang],
      [-hW - roofOverhang, eaveH, hD + roofOverhang],
      [0, apexH + roofOverhang * 0.5, hD + roofOverhang],
      [0, apexH + roofOverhang * 0.5, -hD - roofOverhang]
    ),
    roofPanelMat,
    [0, 0, 0]
  );

  // Right slope
  addDecor(
    makeQuadGeo(
      [0, apexH + roofOverhang * 0.5, -hD - roofOverhang],
      [0, apexH + roofOverhang * 0.5, hD + roofOverhang],
      [hW + roofOverhang, eaveH, hD + roofOverhang],
      [hW + roofOverhang, eaveH, -hD - roofOverhang]
    ),
    roofPanelMat,
    [0, 0, 0]
  );

  // ── Eave fascia trim ──────────────────────────────────────────────
  for (const s of [-1, 1]) {
    addDecor(
      new THREE.BoxGeometry(0.08, 0.3, D + 0.4),
      trimMat,
      [s * hW, eaveH + 0.15, 0]
    );
  }

  // Ridge cap
  addDecor(
    new THREE.BoxGeometry(0.15, 0.08, D + 0.4),
    trimMat,
    [0, apexH + 0.04, 0]
  );

  // ── Gutters (L-shaped profile at eave) ────────────────────────────
  for (const s of [-1, 1]) {
    const gutterShape = new THREE.Shape();
    gutterShape.moveTo(0, 0);
    gutterShape.lineTo(0.12, 0);
    gutterShape.lineTo(0.12, 0.08);
    gutterShape.lineTo(0.02, 0.08);
    gutterShape.lineTo(0.02, 0.02);
    gutterShape.lineTo(0, 0.02);
    gutterShape.lineTo(0, 0);
    const gutterGeo = new THREE.ExtrudeGeometry(gutterShape, { depth: D + roofOverhang, bevelEnabled: false });
    const gutter = new THREE.Mesh(gutterGeo, trimMat);
    gutter.position.set(s * (hW + roofOverhang) - (s > 0 ? 0.12 : 0), eaveH - 0.02, -(hD + roofOverhang / 2));
    group.add(gutter);
  }

  // ── Downspouts ────────────────────────────────────────────────────
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addDecor(
        new THREE.CylinderGeometry(0.04, 0.04, eaveH, 8),
        trimMat,
        [sx * hW + (sx < 0 ? 0.06 : -0.06), eaveH / 2, sz * hD + (sz < 0 ? 0.06 : -0.06)]
      );
    }
  }

  // ── Personnel door (small door on right wall) ─────────────────────
  const pdW = 1.0;
  const pdH = 2.2;
  const pdZ = -D / 2 + 2;
  // Door panel
  addDecor(
    new THREE.PlaneGeometry(pdW, pdH),
    new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.6, roughness: 0.4 }),
    [hW + clad + 0.02, pdH / 2, pdZ],
    [0, -Math.PI / 2, 0]
  );
  // Frame
  addDecor(new THREE.BoxGeometry(0.06, pdH + 0.08, 0.12), trimMat, [hW + clad, pdH / 2, pdZ - pdW / 2]);
  addDecor(new THREE.BoxGeometry(0.06, pdH + 0.08, 0.12), trimMat, [hW + clad, pdH / 2, pdZ + pdW / 2]);
  addDecor(new THREE.BoxGeometry(0.06, 0.06, pdW + 0.12), trimMat, [hW + clad, pdH + 0.04, pdZ]);

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
    camera.position.set(18, 12, 18);
    camera.lookAt(0, 3, 0);
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
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      setWebglError(true);
      return;
    }

    // Lighting - tuned for MeshPhysicalMaterial
    const ambientLight = new THREE.AmbientLight(0x506070, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(12, 25, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 60;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4488cc, 0.4);
    fillLight.position.set(-10, 8, -10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.25);
    rimLight.position.set(-5, 3, 15);
    scene.add(rimLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(60, 60);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a365d,
      roughness: 0.85,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
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
        
        camera.lookAt(0, 3, 0);
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
        camera.position.x = 22 * Math.cos(angle);
        camera.position.z = 22 * Math.sin(angle);
        camera.lookAt(0, 3, 0);
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
          const pingTime = (Date.now() % 2000) / 2000;
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
      camera.position.set(18, 12, 18);
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