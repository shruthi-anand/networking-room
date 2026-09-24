import * as THREE from 'three';
import { V } from './core.js';

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const prog = (t, start, dur) => Math.min(1, Math.max(0, (t - start) / dur));

function circleLine(pointAt, segments = 128) {
  const pts = [];
  for (let i = 0; i <= segments; i++) pts.push(pointAt((i / segments) * Math.PI * 2));
  return new THREE.BufferGeometry().setFromPoints(pts);
}

export function createBasketballLoadIn({
  textures,
  wireColor = '#f4f6fb',
  seamColor = '#9fc7ff',
  delay = 0,
  wireStart = 0.15, wireDur = 1.3,
  seamStart = 0.9, seamDur = 0.9,
  fillStart = 1.9, fillDur = 1.1,
  roomStart = 2.3, roomDur = 1.4,
} = {}) {
  const group = new THREE.Group();
  const ball = new THREE.Group();
  group.add(ball);
  const wireMat = new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.8, depthWrite: false });
  const seamMat = new THREE.LineBasicMaterial({ color: seamColor, transparent: true, opacity: 1, depthWrite: false });
  const wires = [], seams = [];
  const R = 1.004;
  for (let k = 1; k < 8; k++) { const th = (k / 8) * Math.PI, r = Math.sin(th) * R, y = Math.cos(th) * R; wires.push(new THREE.Line(circleLine((a) => V(Math.cos(a) * r, y, Math.sin(a) * r)), wireMat)); }
  for (let k = 0; k < 8; k++) { const ph = (k / 8) * Math.PI; wires.push(new THREE.Line(circleLine((a) => V(Math.cos(ph) * Math.sin(a) * R, Math.cos(a) * R, Math.sin(ph) * Math.sin(a) * R)), wireMat)); }
  const S = 1.012, ca = Math.cos(-Math.PI / 4), sa = Math.sin(-Math.PI / 4), sr = Math.sqrt(1 - 0.62 * 0.62) * S;
  seams.push(new THREE.Line(circleLine((a) => V(Math.cos(a) * S, Math.sin(a) * sa * S, Math.sin(a) * ca * S)), seamMat));
  seams.push(new THREE.Line(circleLine((a) => V(Math.cos(a) * S, Math.sin(a) * ca * S, Math.sin(a) * -sa * S)), seamMat));
  seams.push(new THREE.Line(circleLine((a) => V(0.62 * S, Math.cos(a) * sr, Math.sin(a) * sr)), seamMat));
  seams.push(new THREE.Line(circleLine((a) => V(-0.62 * S, Math.cos(a) * sr, Math.sin(a) * sr)), seamMat));
  [...wires, ...seams].forEach((line) => { line.geometry.setDrawRange(0, 0); ball.add(line); });
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const solidMat = new THREE.MeshStandardMaterial({ map: textures.map, bumpMap: textures.bumpMap, bumpScale: 2.2, roughness: 0.62, metalness: 0.02, clippingPlanes: [clip] });
  const solid = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), solidMat);
  ball.add(solid);
  const edgeMat = new THREE.MeshBasicMaterial({ color: wireColor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const edge = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), edgeMat);
  edge.rotation.x = Math.PI / 2; group.add(edge);
  let spin = 0, lastT = 0, resolved = false, yaw = 0;
  const SEGS = 129;

  function update(tAbs) {
    const t = tAbs - delay;
    const dt = Math.max(0, tAbs - lastT); lastT = tAbs;
    wires.forEach((line, i) => line.geometry.setDrawRange(0, Math.floor(easeInOut(prog(t, wireStart + i * (wireDur * 0.5 / wires.length), wireDur * 0.5)) * SEGS)));
    seams.forEach((line, i) => line.geometry.setDrawRange(0, Math.floor(easeInOut(prog(t, seamStart + i * 0.12, seamDur - 0.36)) * SEGS)));
    const f = easeInOut(prog(t, fillStart, fillDur));
    const h = -1 + f * 2.02;
    clip.constant = f >= 1 ? 1e6 : group.position.y + h * group.scale.y;
    solid.visible = f > 0;
    edge.scale.setScalar(Math.max(Math.sqrt(Math.max(0, 1 - h * h)) * 1.01, 0.0001));
    edge.position.y = h;
    edgeMat.opacity = f > 0 && f < 1 ? Math.sin(f * Math.PI) * 0.9 : 0;
    const wireFade = 1 - easeOut(prog(t, fillStart + fillDur * 0.35, fillDur * 0.9));
    wireMat.opacity = 0.8 * wireFade; seamMat.opacity = wireFade;
    spin += dt * (0.42 + 2.4 * Math.exp(-Math.max(0, t) * 1.1));
    ball.rotation.set(0.1, yaw + spin, 0.05);
    const pop = prog(t, fillStart + fillDur - 0.1, 0.5);
    ball.scale.setScalar(1 + Math.sin(pop * Math.PI) * 0.035);
    if (f >= 1) resolved = true;
    return { fill: f, room: easeInOut(prog(t, roomStart, roomDur)), settle: prog(t, fillStart + fillDur, 1.2), resolved };
  }
  function reset() { lastT = 0; spin = 0; resolved = false; update(0); }
  return { group, update, reset, setYaw(v) { yaw = v; }, get spin() { return spin; } };
}
