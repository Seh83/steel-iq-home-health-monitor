import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import AlertTooltip from './AlertTooltip';
import ViewControls from './ViewControls';
import ComponentPropertiesPanel from './ComponentPropertiesPanel';
import PanelDetailView from '../panels/PanelDetailView';
import SensorActionModal from '../sensors/SensorActionModal';

// Residential steel-frame house generator — multi-section with curved wing
function createWarehouse() {
  const group = new THREE.Group();
  const components = [];

  // ── Materials ──────────────────────────────────────────────────────
  const framingMat = new THREE.MeshStandardMaterial({
    color: 0x4a5568,
    metalness: 0.55,
    roughness: 0.55,
  });

  const heavyFramingMat = new THREE.MeshStandardMaterial({
    color: 0x3d4a5c,
    metalness: 0.6,
    roughness: 0.5,
  });

  const wallPanelMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a5a,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
  });

  const roofPanelMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a4a,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x353f4f,
    roughness: 0.9,
    metalness: 0.1,
  });

  const edgeLineMat = new THREE.LineBasicMaterial({
    color: 0x6a7a8a,
    transparent: true,
    opacity: 0.5,
  });

  // ── Dimensions — Main Section ──────────────────────────────────────
  const W = 14;          // main section width (X)
  const D = 16;          // main section depth (Z)
  const eaveH = 5.2;     // wall height
  const ridgeH = 3.2;    // gable rise
  const apexH = eaveH + ridgeH;
  const bay = 2;
  const bS = 0.08;       // steel member cross-section
  const studS = 0.05;    // stud cross-section
  const studSpacing = 0.45;

  // ── Dimensions — Curved Wing ───────────────────────────────────────
  const curveCenter = [W / 2, 0, 0];         // arc center at right wall midpoint
  const curveRadius = 7;
  const curveStartAngle = -Math.PI * 0.4;
  const curveEndAngle = Math.PI * 0.4;
  const curveSegments = 28;
  const curveHeight = 4.8;
  const curveRoofRise = 2.0;

  // ── Dimensions — Second Floor ──────────────────────────────────────
  const floorTwoH = 2.8;

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

  let _id = 0;
  const nextId = (prefix) => `${prefix}-${++_id}`;

  const addFraming = (geo, mat, pos, type, id, data, rot = null) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      id,
      type,
      material: 'Steel Framing',
      position: { x: pos[0], y: pos[1], z: pos[2] },
      selectable: true,
      ...data,
    };
    group.add(mesh);
    components.push(mesh);
    const edges = new THREE.EdgesGeometry(geo, 20);
    const line = new THREE.LineSegments(edges, edgeLineMat);
    mesh.add(line);
    return mesh;
  };

  const addDecor = (geo, mat, pos, rot) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const addSilentFraming = (geo, mat, pos, rot) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const edges = new THREE.EdgesGeometry(geo, 20);
    mesh.add(new THREE.LineSegments(edges, edgeLineMat));
    return mesh;
  };

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

  const makeTriGeo = (a, b, c) => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  };

  const addLine = (p1, p2, mat) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1[0], p1[1], p1[2]),
      new THREE.Vector3(p2[0], p2[1], p2[2]),
    ]);
    group.add(new THREE.Line(geo, mat));
  };

  const addRod = (p1, p2, radius, mat) => {
    const start = new THREE.Vector3(p1[0], p1[1], p1[2]);
    const end = new THREE.Vector3(p2[0], p2[1], p2[2]);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(radius, radius, len, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Check if a stud at position along a wall should be skipped for an opening
  const isInOpening = (pos, openings) => {
    for (const op of openings) {
      if (pos >= op.start - studS && pos <= op.end + studS) return op;
    }
    return null;
  };

  // Generate studs along a wall with openings
  const buildWallStuds = (
    wallAxis, fixedCoord, rangeStart, rangeEnd,
    height, baseY, openings, isXAxis
  ) => {
    const studGeo = new THREE.BoxGeometry(
      isXAxis ? studS : studS,
      height,
      isXAxis ? studS : studS
    );
    for (let p = rangeStart; p <= rangeEnd; p += studSpacing) {
      const op = isInOpening(p, openings);
      if (op) {
        // Trimmer studs at opening edges
        if (Math.abs(p - op.start) < studSpacing) {
          const pos = isXAxis
            ? [op.start - studS, baseY + height / 2, fixedCoord]
            : [fixedCoord, baseY + height / 2, op.start - studS];
          addSilentFraming(studGeo, framingMat, pos);
          // Jack stud (shorter, below header)
          if (op.headerH) {
            const jackH = op.headerH - baseY;
            if (jackH > 0) {
              const jackGeo = new THREE.BoxGeometry(studS, jackH, studS);
              const jPos = isXAxis
                ? [op.start + studS, baseY + jackH / 2, fixedCoord]
                : [fixedCoord, baseY + jackH / 2, op.start + studS];
              addSilentFraming(jackGeo, framingMat, jPos);
            }
          }
        }
        if (Math.abs(p - op.end) < studSpacing) {
          const pos = isXAxis
            ? [op.end + studS, baseY + height / 2, fixedCoord]
            : [fixedCoord, baseY + height / 2, op.end + studS];
          addSilentFraming(studGeo, framingMat, pos);
          if (op.headerH) {
            const jackH = op.headerH - baseY;
            if (jackH > 0) {
              const jackGeo = new THREE.BoxGeometry(studS, jackH, studS);
              const jPos = isXAxis
                ? [op.end - studS, baseY + jackH / 2, fixedCoord]
                : [fixedCoord, baseY + jackH / 2, op.end - studS];
              addSilentFraming(jackGeo, framingMat, jPos);
            }
          }
        }
        // Header beam above opening
        if (op.headerH && Math.abs(p - (op.start + op.end) / 2) < studSpacing / 2) {
          const headerLen = op.end - op.start + studS * 2;
          const headerGeo = new THREE.BoxGeometry(
            isXAxis ? headerLen : bS,
            bS,
            isXAxis ? bS : headerLen
          );
          const hPos = isXAxis
            ? [(op.start + op.end) / 2, op.headerH, fixedCoord]
            : [fixedCoord, op.headerH, (op.start + op.end) / 2];
          addSilentFraming(headerGeo, heavyFramingMat, hPos);
          // Sill for windows
          if (op.sillH) {
            const sillGeo = new THREE.BoxGeometry(
              isXAxis ? headerLen : bS * 0.7,
              bS * 0.7,
              isXAxis ? bS * 0.7 : headerLen
            );
            const sPos = isXAxis
              ? [(op.start + op.end) / 2, op.sillH, fixedCoord]
              : [fixedCoord, op.sillH, (op.start + op.end) / 2];
            addSilentFraming(sillGeo, framingMat, sPos);
          }
        }
        continue;
      }
      const pos = isXAxis
        ? [p, baseY + height / 2, fixedCoord]
        : [fixedCoord, baseY + height / 2, p];
      addSilentFraming(studGeo, framingMat, pos);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // FLOOR
  // ═══════════════════════════════════════════════════════════════════
  const hW = W / 2;
  const hD = D / 2;

  // Main section floor
  addDecor(new THREE.BoxGeometry(W + 0.4, 0.15, D + 0.4), floorMat, [0, -0.08, 0]);

  // Curved wing floor
  const curveFloorShape = new THREE.Shape();
  for (let i = 0; i <= curveSegments; i++) {
    const angle = curveStartAngle + (curveEndAngle - curveStartAngle) * (i / curveSegments);
    const x = curveCenter[0] + Math.sin(angle) * curveRadius;
    const z = curveCenter[2] + Math.cos(angle) * curveRadius;
    if (i === 0) curveFloorShape.moveTo(x, z);
    else curveFloorShape.lineTo(x, z);
  }
  curveFloorShape.lineTo(curveCenter[0], curveCenter[2] + Math.cos(curveStartAngle) * curveRadius);
  const curveFloorGeo = new THREE.ExtrudeGeometry(curveFloorShape, { depth: 0.15, bevelEnabled: false });
  const curveFloor = new THREE.Mesh(curveFloorGeo, floorMat);
  curveFloor.rotation.x = -Math.PI / 2;
  curveFloor.position.y = -0.08;
  curveFloor.receiveShadow = true;
  group.add(curveFloor);

  // Subtle floor grid on main section
  const gridMat = new THREE.LineBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.12 });
  for (let x = -hW; x <= hW; x += bay) addLine([x, 0.01, -hD], [x, 0.01, hD], gridMat);
  for (let z = -hD; z <= hD; z += bay) addLine([-hW, 0.01, z], [hW, 0.01, z], gridMat);

  // ═══════════════════════════════════════════════════════════════════
  // MAIN SECTION — STRUCTURAL STEEL FRAME
  // ═══════════════════════════════════════════════════════════════════

  // Opening definitions for each wall: { start, end, headerH, sillH? }
  const frontOpenings = [
    { start: -4, end: -2.2, headerH: 4.2, sillH: 1.0 },   // window
    { start: -0.5, end: 0.5, headerH: 4.6 },                // door
    { start: 2.2, end: 4, headerH: 4.2, sillH: 1.0 },      // window
  ];
  const backOpenings = [
    { start: -3, end: -1.5, headerH: 4.2, sillH: 1.2 },
    { start: 2, end: 3.5, headerH: 4.2, sillH: 1.2 },
  ];
  const leftOpenings = [
    { start: -5, end: -3.2, headerH: 4.2, sillH: 1.0 },
    { start: -1, end: 1, headerH: 4.6 },
    { start: 3, end: 5, headerH: 4.2, sillH: 1.0 },
  ];
  const rightOpenings = [
    { start: -5, end: -3.5, headerH: 4.2, sillH: 1.0 },
    { start: 3.5, end: 5, headerH: 4.2, sillH: 1.0 },
  ];

  // ── Corner Columns ─────────────────────────────────────────────────
  const colGeo = new THREE.BoxGeometry(bS * 1.2, eaveH, bS * 1.2);
  for (const x of [-hW, hW]) {
    for (const z of [-hD, hD]) {
      addFraming(colGeo, heavyFramingMat, [x, eaveH / 2, z],
        'Structural Column', nextId('COL'),
        componentData('Structural Column', `HSS 4x4 (${eaveH}m)`, '35 kg', '1200 kN'));
    }
  }

  // ── Bay Columns (at bay spacing along depth) ───────────────────────
  const numBaysD = Math.round(D / bay);
  for (let zi = 1; zi < numBaysD; zi++) {
    const z = -hD + zi * bay;
    for (const x of [-hW, hW]) {
      addFraming(new THREE.BoxGeometry(bS, eaveH, bS), framingMat,
        [x, eaveH / 2, z], 'Wall Stud', nextId('STD'),
        componentData('Wall Stud', `C-stud (${eaveH}m)`, '12 kg', '800 kN'));
    }
  }

  const numBaysW = Math.round(W / bay);
  for (let xi = 1; xi < numBaysW; xi++) {
    const x = -hW + xi * bay;
    for (const z of [-hD, hD]) {
      addFraming(new THREE.BoxGeometry(bS, eaveH, bS), framingMat,
        [x, eaveH / 2, z], 'Wall Stud', nextId('STD'),
        componentData('Wall Stud', `C-stud (${eaveH}m)`, '12 kg', '800 kN'));
    }
  }

  // ── Top Plates ─────────────────────────────────────────────────────
  const tpGeoW = new THREE.BoxGeometry(W, bS, bS);
  const tpGeoD = new THREE.BoxGeometry(bS, bS, D);
  for (const z of [-hD, hD]) {
    addFraming(tpGeoW, heavyFramingMat, [0, eaveH, z],
      'Top Plate', nextId('TP'), componentData('Top Plate', `${W}m`, '20 kg', '600 kN'));
  }
  for (const x of [-hW, hW]) {
    addFraming(tpGeoD, heavyFramingMat, [x, eaveH, 0],
      'Top Plate', nextId('TP'), componentData('Top Plate', `${D}m`, '24 kg', '600 kN'));
  }

  // ── Bottom Plates ──────────────────────────────────────────────────
  const bpGeoW = new THREE.BoxGeometry(W, bS * 0.7, bS * 0.7);
  const bpGeoD = new THREE.BoxGeometry(bS * 0.7, bS * 0.7, D);
  for (const z of [-hD, hD]) addSilentFraming(bpGeoW, framingMat, [0, bS * 0.35, z]);
  for (const x of [-hW, hW]) addSilentFraming(bpGeoD, framingMat, [x, bS * 0.35, 0]);

  // ── Second Floor Framing ───────────────────────────────────────────
  // Floor joists at second floor level
  const floorJoistGeo = new THREE.BoxGeometry(W, bS * 0.7, bS * 0.7);
  for (let z = -hD; z <= hD; z += bay) {
    addFraming(floorJoistGeo, framingMat, [0, floorTwoH, z],
      'Floor Joist', nextId('FJ'),
      componentData('Floor Joist', `${W}m joist`, '14 kg', '500 kN'));
  }
  // Rim joists
  const rimGeoD = new THREE.BoxGeometry(bS * 0.7, bS * 0.7, D);
  for (const x of [-hW, hW]) addSilentFraming(rimGeoD, framingMat, [x, floorTwoH, 0]);

  // ── Wall Studs with Openings — Ground Floor ────────────────────────
  // Front wall (z = -hD, studs along X)
  buildWallStuds('x', -hD, -hW, hW, floorTwoH, 0, frontOpenings, true);
  // Back wall (z = +hD, studs along X)
  buildWallStuds('x', hD, -hW, hW, floorTwoH, 0, backOpenings, true);
  // Left wall (x = -hW, studs along Z)
  buildWallStuds('z', -hW, -hD, hD, floorTwoH, 0, leftOpenings, false);
  // Right wall (x = +hW, studs along Z)
  buildWallStuds('z', hW, -hD, hD, floorTwoH, 0, rightOpenings, false);

  // ── Wall Studs — Upper Floor ───────────────────────────────────────
  const upperOpeningsFront = [
    { start: -4, end: -2.5, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
    { start: -0.8, end: 0.8, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
    { start: 2.5, end: 4, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
  ];
  const upperOpeningsBack = [
    { start: -3, end: -1.5, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
    { start: 1.5, end: 3, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
  ];
  const upperOpeningsL = [
    { start: -5, end: -3.5, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
    { start: 1, end: 3, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
  ];
  const upperOpeningsR = [
    { start: -4, end: -2.5, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
    { start: 2.5, end: 4, headerH: floorTwoH + 2.2, sillH: floorTwoH + 0.8 },
  ];

  const upperH = eaveH - floorTwoH;
  buildWallStuds('x', -hD, -hW, hW, upperH, floorTwoH, upperOpeningsFront, true);
  buildWallStuds('x', hD, -hW, hW, upperH, floorTwoH, upperOpeningsBack, true);
  buildWallStuds('z', -hW, -hD, hD, upperH, floorTwoH, upperOpeningsL, false);
  buildWallStuds('z', hW, -hD, hD, upperH, floorTwoH, upperOpeningsR, false);

  // ── Interior Partition Walls ───────────────────────────────────────
  const partitions = [
    // Ground floor partitions
    { axis: 'x', fixed: 0, from: -hW + 0.5, to: hW - 0.5, y: 0, h: floorTwoH,
      openings: [{ start: -1, end: 0, headerH: 2.5 }, { start: 3, end: 4, headerH: 2.5 }] },
    { axis: 'z', fixed: -2, from: -hD + 0.5, to: 0, y: 0, h: floorTwoH,
      openings: [{ start: -5, end: -4, headerH: 2.5 }] },
    { axis: 'z', fixed: 3, from: 0, to: hD - 0.5, y: 0, h: floorTwoH,
      openings: [{ start: 2, end: 3, headerH: 2.5 }] },
    // Upper floor partitions
    { axis: 'x', fixed: 0.5, from: -hW + 0.5, to: hW - 0.5, y: floorTwoH, h: upperH,
      openings: [{ start: -1, end: 0, headerH: floorTwoH + 2.3 }] },
    { axis: 'z', fixed: -3, from: -hD + 0.5, to: 0.5, y: floorTwoH, h: upperH,
      openings: [{ start: -4, end: -3, headerH: floorTwoH + 2.3 }] },
  ];

  partitions.forEach((p) => {
    const isX = p.axis === 'x';
    const partStudGeo = new THREE.BoxGeometry(studS, p.h, studS);
    for (let v = p.from; v <= p.to; v += studSpacing) {
      const op = isInOpening(v, p.openings);
      if (op) continue;
      const pos = isX ? [v, p.y + p.h / 2, p.fixed] : [p.fixed, p.y + p.h / 2, v];
      addSilentFraming(partStudGeo, framingMat, pos);
    }
    // Top and bottom plates for partition
    const len = p.to - p.from;
    const plateGeo = isX
      ? new THREE.BoxGeometry(len, bS * 0.6, bS * 0.6)
      : new THREE.BoxGeometry(bS * 0.6, bS * 0.6, len);
    const mid = (p.from + p.to) / 2;
    const topPos = isX ? [mid, p.y + p.h, p.fixed] : [p.fixed, p.y + p.h, mid];
    const botPos = isX ? [mid, p.y + bS * 0.3, p.fixed] : [p.fixed, p.y + bS * 0.3, mid];
    addSilentFraming(plateGeo, framingMat, topPos);
    addSilentFraming(plateGeo, framingMat, botPos);
    // Header beams over openings
    p.openings.forEach((op) => {
      if (!op.headerH) return;
      const hLen = op.end - op.start + studS * 2;
      const hGeo = isX
        ? new THREE.BoxGeometry(hLen, bS, bS)
        : new THREE.BoxGeometry(bS, bS, hLen);
      const hMid = (op.start + op.end) / 2;
      const hPos = isX ? [hMid, op.headerH, p.fixed] : [p.fixed, op.headerH, hMid];
      addSilentFraming(hGeo, heavyFramingMat, hPos);
    });
  });

  // ── Cross Bracing (select bays) ────────────────────────────────────
  const braceBays = [
    // Left wall bracing
    { p1: [-hW, 0, -hD], p2: [-hW, floorTwoH, -hD + bay] },
    { p1: [-hW, floorTwoH, -hD], p2: [-hW, 0, -hD + bay] },
    { p1: [-hW, 0, hD - bay], p2: [-hW, floorTwoH, hD] },
    { p1: [-hW, floorTwoH, hD - bay], p2: [-hW, 0, hD] },
    // Right wall bracing
    { p1: [hW, 0, -hD], p2: [hW, floorTwoH, -hD + bay] },
    { p1: [hW, floorTwoH, -hD], p2: [hW, 0, -hD + bay] },
    { p1: [hW, 0, hD - bay], p2: [hW, floorTwoH, hD] },
    { p1: [hW, floorTwoH, hD - bay], p2: [hW, 0, hD] },
  ];
  braceBays.forEach(({ p1, p2 }) => {
    addRod(p1, p2, 0.015, framingMat);
  });

  // ═══════════════════════════════════════════════════════════════════
  // ROOF TRUSSES (Main Section)
  // ═══════════════════════════════════════════════════════════════════

  const trussSpacing = bay;
  for (let z = -hD; z <= hD; z += trussSpacing) {
    // Top chords (rafters)
    const rafterLen = Math.sqrt((W / 2) ** 2 + ridgeH ** 2);
    const rafterAngle = Math.atan2(ridgeH, W / 2);

    addFraming(
      new THREE.BoxGeometry(rafterLen, bS, bS), framingMat,
      [-W / 4, eaveH + ridgeH / 2, z], 'Roof Rafter', nextId('RFT'),
      componentData('Roof Rafter', `${rafterLen.toFixed(1)}m`, '18 kg', '600 kN'),
      [0, 0, rafterAngle]
    );
    addFraming(
      new THREE.BoxGeometry(rafterLen, bS, bS), framingMat,
      [W / 4, eaveH + ridgeH / 2, z], 'Roof Rafter', nextId('RFT'),
      componentData('Roof Rafter', `${rafterLen.toFixed(1)}m`, '18 kg', '600 kN'),
      [0, 0, -rafterAngle]
    );

    // Bottom chord (ceiling joist / tie beam)
    addFraming(
      new THREE.BoxGeometry(W, bS * 0.7, bS * 0.7), framingMat,
      [0, eaveH, z], 'Ceiling Joist', nextId('CJ'),
      componentData('Ceiling Joist', `${W}m tie`, '16 kg', '500 kN')
    );

    // Truss web members — king post + diagonals
    // King post (vertical at center)
    const kingH = ridgeH;
    addSilentFraming(
      new THREE.BoxGeometry(bS * 0.6, kingH, bS * 0.6), framingMat,
      [0, eaveH + kingH / 2, z]
    );

    // Diagonal web members (from base of king post to mid-rafter on each side)
    const quarterW = W / 4;
    const midRafterH = eaveH + ridgeH / 2;
    addRod(
      [0, eaveH, z], [-quarterW, midRafterH, z], 0.012, framingMat
    );
    addRod(
      [0, eaveH, z], [quarterW, midRafterH, z], 0.012, framingMat
    );

    // Secondary verticals at quarter points
    const qRiseL = ridgeH * 0.5;
    addSilentFraming(
      new THREE.BoxGeometry(bS * 0.5, qRiseL, bS * 0.5), framingMat,
      [-quarterW, eaveH + qRiseL / 2, z]
    );
    addSilentFraming(
      new THREE.BoxGeometry(bS * 0.5, qRiseL, bS * 0.5), framingMat,
      [quarterW, eaveH + qRiseL / 2, z]
    );
  }

  // Ridge beam
  addFraming(
    new THREE.BoxGeometry(bS * 1.2, bS * 1.2, D), heavyFramingMat,
    [0, apexH, 0], 'Ridge Board', 'RDG-1',
    componentData('Ridge Board', `${D}m ridge`, '28 kg', '500 kN')
  );

  // ── Purlins (horizontal members along roof slope) ──────────────────
  const purlinCount = 4;
  for (let pi = 1; pi <= purlinCount; pi++) {
    const frac = pi / (purlinCount + 1);
    const xL = -hW + frac * (W / 2);
    const xR = frac * (W / 2);
    const yP = eaveH + frac * ridgeH;
    addSilentFraming(
      new THREE.BoxGeometry(bS * 0.6, bS * 0.6, D), framingMat,
      [xL, yP, 0]
    );
    addSilentFraming(
      new THREE.BoxGeometry(bS * 0.6, bS * 0.6, D), framingMat,
      [xR, yP, 0]
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // CURVED WING
  // ═══════════════════════════════════════════════════════════════════

  const cx = curveCenter[0];
  const cz = curveCenter[2];

  // Curved wall studs
  for (let i = 0; i <= curveSegments; i++) {
    const angle = curveStartAngle + (curveEndAngle - curveStartAngle) * (i / curveSegments);
    const x = cx + Math.sin(angle) * curveRadius;
    const z = cz + Math.cos(angle) * curveRadius;

    // Full-height stud
    const studGeo = new THREE.BoxGeometry(studS, curveHeight, studS);
    const stud = addSilentFraming(studGeo, framingMat, [x, curveHeight / 2, z]);
    // Rotate stud to face center
    stud.rotation.y = -angle;
  }

  // Curved top and bottom plates (segmented)
  for (let i = 0; i < curveSegments; i++) {
    const a1 = curveStartAngle + (curveEndAngle - curveStartAngle) * (i / curveSegments);
    const a2 = curveStartAngle + (curveEndAngle - curveStartAngle) * ((i + 1) / curveSegments);
    const x1 = cx + Math.sin(a1) * curveRadius;
    const z1 = cz + Math.cos(a1) * curveRadius;
    const x2 = cx + Math.sin(a2) * curveRadius;
    const z2 = cz + Math.cos(a2) * curveRadius;
    const segLen = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    const segAngle = Math.atan2(x2 - x1, z2 - z1);
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;

    // Top plate segment
    const tpSeg = addSilentFraming(
      new THREE.BoxGeometry(bS * 0.7, bS * 0.7, segLen), framingMat,
      [mx, curveHeight, mz]
    );
    tpSeg.rotation.y = -segAngle + Math.PI;

    // Bottom plate segment
    const bpSeg = addSilentFraming(
      new THREE.BoxGeometry(bS * 0.6, bS * 0.6, segLen), framingMat,
      [mx, bS * 0.3, mz]
    );
    bpSeg.rotation.y = -segAngle + Math.PI;
  }

  // Curved roof ribs (barrel vault)
  const curveRibCount = 12;
  for (let i = 0; i <= curveRibCount; i++) {
    const frac = i / curveRibCount;
    const ribAngle = curveStartAngle + (curveEndAngle - curveStartAngle) * frac;
    const outerX = cx + Math.sin(ribAngle) * curveRadius;
    const outerZ = cz + Math.cos(ribAngle) * curveRadius;
    // Rib from wall top to barrel center ridge
    const ribLen = Math.sqrt(curveRadius ** 2 + curveRoofRise ** 2) * 0.5;
    const ridgeX = cx + Math.sin(ribAngle) * (curveRadius * 0.02);
    const ridgeZ = cz + Math.cos(ribAngle) * (curveRadius * 0.02);

    addRod(
      [outerX, curveHeight, outerZ],
      [ridgeX, curveHeight + curveRoofRise, ridgeZ],
      0.015, framingMat
    );
  }

  // Barrel vault ridge beam (follows the curve at top)
  for (let i = 0; i < curveRibCount; i++) {
    const a1 = curveStartAngle + (curveEndAngle - curveStartAngle) * (i / curveRibCount);
    const a2 = curveStartAngle + (curveEndAngle - curveStartAngle) * ((i + 1) / curveRibCount);
    const x1 = cx + Math.sin(a1) * (curveRadius * 0.02);
    const z1 = cz + Math.cos(a1) * (curveRadius * 0.02);
    const x2 = cx + Math.sin(a2) * (curveRadius * 0.02);
    const z2 = cz + Math.cos(a2) * (curveRadius * 0.02);
    addRod(
      [x1, curveHeight + curveRoofRise, z1],
      [x2, curveHeight + curveRoofRise, z2],
      0.015, heavyFramingMat
    );
  }

  // Curved wing horizontal rings (purlins on barrel vault)
  const curveRingCount = 3;
  for (let ri = 1; ri <= curveRingCount; ri++) {
    const ringFrac = ri / (curveRingCount + 1);
    const ringR = curveRadius * (1 - ringFrac) + curveRadius * 0.02 * ringFrac;
    const ringY = curveHeight + curveRoofRise * ringFrac;
    for (let i = 0; i < curveSegments; i++) {
      const a1 = curveStartAngle + (curveEndAngle - curveStartAngle) * (i / curveSegments);
      const a2 = curveStartAngle + (curveEndAngle - curveStartAngle) * ((i + 1) / curveSegments);
      const x1 = cx + Math.sin(a1) * ringR;
      const z1 = cz + Math.cos(a1) * ringR;
      const x2 = cx + Math.sin(a2) * ringR;
      const z2 = cz + Math.cos(a2) * ringR;
      addRod([x1, ringY, z1], [x2, ringY, z2], 0.01, framingMat);
    }
  }

  // Connection framing between main section and curved wing
  const connZ1 = cz + Math.cos(curveStartAngle) * curveRadius;
  const connZ2 = cz + Math.cos(curveEndAngle) * curveRadius;
  // Vertical columns at connection points
  addFraming(
    new THREE.BoxGeometry(bS * 1.2, curveHeight, bS * 1.2), heavyFramingMat,
    [hW, curveHeight / 2, connZ1], 'Structural Column', nextId('COL'),
    componentData('Structural Column', `HSS 4x4`, '30 kg', '1000 kN')
  );
  addFraming(
    new THREE.BoxGeometry(bS * 1.2, curveHeight, bS * 1.2), heavyFramingMat,
    [hW, curveHeight / 2, connZ2], 'Structural Column', nextId('COL'),
    componentData('Structural Column', `HSS 4x4`, '30 kg', '1000 kN')
  );

  // ═══════════════════════════════════════════════════════════════════
  // CLADDING / TRANSPARENT PANELS (main section)
  // ═══════════════════════════════════════════════════════════════════

  const clad = 0.06;
  // Side wall panels
  addDecor(makeQuadGeo(
    [-hW - clad, 0, -hD], [-hW - clad, 0, hD],
    [-hW - clad, eaveH, hD], [-hW - clad, eaveH, -hD]
  ), wallPanelMat, [0, 0, 0]);
  addDecor(makeQuadGeo(
    [hW + clad, 0, -hD], [hW + clad, eaveH, -hD],
    [hW + clad, eaveH, hD], [hW + clad, 0, hD]
  ), wallPanelMat, [0, 0, 0]);

  // Front and back wall panels
  addDecor(makeQuadGeo(
    [-hW, 0, -hD - clad], [-hW, eaveH, -hD - clad],
    [hW, eaveH, -hD - clad], [hW, 0, -hD - clad]
  ), wallPanelMat, [0, 0, 0]);
  addDecor(makeTriGeo(
    [0, apexH, -hD - clad], [-hW, eaveH, -hD - clad], [hW, eaveH, -hD - clad]
  ), wallPanelMat, [0, 0, 0]);
  addDecor(makeQuadGeo(
    [-hW, 0, hD + clad], [hW, 0, hD + clad],
    [hW, eaveH, hD + clad], [-hW, eaveH, hD + clad]
  ), wallPanelMat, [0, 0, 0]);
  addDecor(makeTriGeo(
    [0, apexH, hD + clad], [hW, eaveH, hD + clad], [-hW, eaveH, hD + clad]
  ), wallPanelMat, [0, 0, 0]);

  // Roof panels (transparent sheathing)
  const roofOverhang = 0.4;
  addDecor(makeQuadGeo(
    [-hW - roofOverhang, eaveH, -hD - roofOverhang],
    [-hW - roofOverhang, eaveH, hD + roofOverhang],
    [0, apexH + 0.1, hD + roofOverhang],
    [0, apexH + 0.1, -hD - roofOverhang]
  ), roofPanelMat, [0, 0, 0]);
  addDecor(makeQuadGeo(
    [0, apexH + 0.1, -hD - roofOverhang],
    [0, apexH + 0.1, hD + roofOverhang],
    [hW + roofOverhang, eaveH, hD + roofOverhang],
    [hW + roofOverhang, eaveH, -hD - roofOverhang]
  ), roofPanelMat, [0, 0, 0]);

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
    scene.background = new THREE.Color(0x2d3d52);
    scene.fog = new THREE.Fog(0x2d3d52, 20, 55);
    sceneRef.current = scene;

    // Camera — wider angle, pulled back further for larger building
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(20, 12, 18);
    camera.lookAt(2, 3, 0);
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

    // Lighting — overcast moody atmosphere matching screenshot
    const ambientLight = new THREE.AmbientLight(0x7080a0, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xdde4f0, 1.1);
    directionalLight.position.set(12, 25, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 80;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x5588bb, 0.45);
    fillLight.position.set(-14, 10, -12);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.2);
    rimLight.position.set(-8, 4, 18);
    scene.add(rimLight);

    // Subtle hemisphere light for outdoor ambient
    const hemiLight = new THREE.HemisphereLight(0x8899bb, 0x334455, 0.3);
    scene.add(hemiLight);

    // Ground plane — larger to match bigger building + surroundings
    const groundGeometry = new THREE.PlaneGeometry(80, 80);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3545,
      roughness: 0.92,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);

    // House structure
    const warehouse = createWarehouse();
    warehouse.position.y = 0;
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

    // Sky with procedural clouds
    const skyGeometry = new THREE.SphereGeometry(45, 48, 48);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x4a6080) },
        midColor: { value: new THREE.Color(0x6a85a8) },
        bottomColor: { value: new THREE.Color(0x2a3545) },
        cloudColor: { value: new THREE.Color(0x8899aa) },
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
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform vec3 cloudColor;
        varying vec3 vWorldPosition;

        // Simple hash-based noise for clouds
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = dir.y;

          // Sky gradient: bottom -> mid -> top
          vec3 skyColor = h < 0.0
            ? mix(bottomColor, midColor, max(h + 0.3, 0.0) / 0.3)
            : mix(midColor, topColor, min(h / 0.6, 1.0));

          // Cloud layer around the horizon and above
          if (h > -0.05 && h < 0.5) {
            vec2 uv = dir.xz / (h + 0.3) * 1.8;
            float cloud = fbm(uv * 1.2 + vec2(0.5, 0.3));
            cloud = smoothstep(0.35, 0.65, cloud);
            // Fade clouds near horizon and at top
            float fade = smoothstep(-0.05, 0.08, h) * smoothstep(0.5, 0.25, h);
            skyColor = mix(skyColor, cloudColor, cloud * fade * 0.6);
          }

          gl_FragColor = vec4(skyColor, 1.0);
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
        camera.position.y = Math.max(3, Math.min(25, camera.position.y - deltaY * 0.05));

        camera.lookAt(2, 3, 0);
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
      if (distance < 10) camera.position.normalize().multiplyScalar(10);
      if (distance > 45) camera.position.normalize().multiplyScalar(45);
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
        angle += 0.0008;
        camera.position.x = 22 * Math.cos(angle) + 2;
        camera.position.z = 22 * Math.sin(angle);
        camera.position.y = 12 + Math.sin(angle * 0.5) * 2;
        camera.lookAt(2, 3, 0);
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
      camera.position.set(20, 12, 18);
      setIsRotating(true);
      setSelectedComponent(null);
    }

    // Clamp distance
    const distance = camera.position.length();
    if (distance < 10) camera.position.normalize().multiplyScalar(10);
    if (distance > 45) camera.position.normalize().multiplyScalar(45);
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