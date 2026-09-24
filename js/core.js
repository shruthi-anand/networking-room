import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

function logoMask(kind, size = 256) {
  const [, g] = makeCanvas(size, size);
  const s = size, m = s / 2;
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  if (kind === 'linkedin') {
    g.beginPath(); g.roundRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8, s * 0.14); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.fillRect(s * 0.24, s * 0.42, s * 0.12, s * 0.36);
    g.beginPath(); g.arc(s * 0.3, s * 0.29, s * 0.075, 0, 7); g.fill();
    g.fillRect(s * 0.44, s * 0.42, s * 0.12, s * 0.36);
    g.beginPath(); g.moveTo(s * 0.5, s * 0.52); g.quadraticCurveTo(s * 0.54, s * 0.41, s * 0.64, s * 0.41);
    g.quadraticCurveTo(s * 0.77, s * 0.41, s * 0.77, s * 0.56); g.lineTo(s * 0.77, s * 0.78); g.lineTo(s * 0.65, s * 0.78);
    g.lineTo(s * 0.65, s * 0.58); g.quadraticCurveTo(s * 0.65, s * 0.51, s * 0.6, s * 0.51); g.quadraticCurveTo(s * 0.54, s * 0.51, s * 0.54, s * 0.6);
    g.lineTo(s * 0.5, s * 0.6); g.closePath(); g.fill();
  } else {
    const r = s * 0.36, a0 = (118 * Math.PI) / 180, a1 = (152 * Math.PI) / 180;
    g.lineWidth = s * 0.075; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(m - s * 0.4, m + s * 0.4); g.lineTo(m + Math.cos(a0) * r, m + Math.sin(a0) * r); g.arc(m, m, r, a0, a1, true); g.closePath(); g.stroke();
    g.lineWidth = s * 0.1; g.lineCap = 'round';
    const cx = m + s * 0.05, cy = m - s * 0.05, hr = s * 0.15;
    g.beginPath(); g.arc(cx, cy, hr, (200 * Math.PI) / 180, (70 * Math.PI) / 180, true); g.stroke();
    [[200], [70]].forEach(([deg]) => { const a = (deg * Math.PI) / 180; g.beginPath(); g.arc(cx + Math.cos(a) * hr, cy + Math.sin(a) * hr, s * 0.07, 0, 7); g.fill(); });
  }
  return g.getImageData(0, 0, s, s);
}

export function brandBallTextures({ base, seam, etch, logo }, W2 = 1024) {
  const H2 = W2 / 2;
  const [cc, cg] = makeCanvas(W2, H2), [bc, bg] = makeCanvas(W2, H2);
  const ci = cg.createImageData(W2, H2), bi = bg.createImageData(W2, H2);
  const mask = logo ? logoMask(logo) : null, MS = 256;
  const B = [parseInt(base.slice(1, 3), 16), parseInt(base.slice(3, 5), 16), parseInt(base.slice(5, 7), 16)];
  const S = [parseInt(seam.slice(1, 3), 16), parseInt(seam.slice(3, 5), 16), parseInt(seam.slice(5, 7), 16)];
  const E = [parseInt(etch.slice(1, 3), 16), parseInt(etch.slice(3, 5), 16), parseInt(etch.slice(5, 7), 16)];
  const ca = Math.cos(-Math.PI / 4), sa = Math.sin(-Math.PI / 4);
  const w = 0.017, LOGO = 0.42;
  const cosPhi = new Float32Array(W2), sinPhi = new Float32Array(W2);
  for (let px = 0; px < W2; px++) { const phi = ((px + 0.5) / W2) * Math.PI * 2; cosPhi[px] = Math.cos(phi); sinPhi[px] = Math.sin(phi); }
  for (let py = 0; py < H2; py++) {
    const th = ((py + 0.5) / H2) * Math.PI, st = Math.sin(th), y = Math.cos(th);
    for (let px = 0; px < W2; px++) {
      const x = -cosPhi[px] * st, z = sinPhi[px] * st;
      const my = y * ca - z * sa, mz = y * sa + z * ca;
      const d = Math.min(Math.abs(my), Math.abs(mz), Math.abs(Math.abs(x) - 0.62));
      const s = d < w * 0.6 ? 1 : d > w ? 0 : (w - d) / (w * 0.4);
      const groove = d < w * 2.4 ? 1 - d / (w * 2.4) : 0;
      const h1 = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453, h2 = Math.sin((px >> 2) * 39.35 + (py >> 2) * 11.13) * 24634.63;
      const n = (h1 - Math.floor(h1)) * 0.5 + (h2 - Math.floor(h2)) * 0.5;
      let L = 0;
      if (mask && Math.abs(z) > 0.72) {
        const u = (z > 0 ? x : -x) / LOGO, v = y / LOGO;
        if (u > -1 && u < 1 && v > -1 && v < 1) {
          const mx = ((u + 1) / 2) * (MS - 1) | 0, myy = ((1 - (v + 1) / 2) * (MS - 1)) | 0;
          L = mask.data[(myy * MS + mx) * 4 + 3] / 255;
        }
      }
      const shade = 1 - groove * 0.2 + (n - 0.5) * 0.1;
      const i = (py * W2 + px) * 4;
      for (let k = 0; k < 3; k++) {
        const body = B[k] * shade * (1 - L) + E[k] * (0.92 + n * 0.08) * L;
        ci.data[i + k] = body * (1 - s) + S[k] * s;
      }
      ci.data[i + 3] = 255;
      const bump = 165 + (n - 0.5) * (L > 0.5 ? 20 : 70) - groove * 55 - s * 100 - L * 70;
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = bump; bi.data[i + 3] = 255;
    }
  }
  cg.putImageData(ci, 0, 0); bg.putImageData(bi, 0, 0);
  return { map: canvasTex(cc), bumpMap: new THREE.CanvasTexture(bc) };
}

export const BRAND = {
  linkedin: { base: '#0a66c2', seam: '#062f5a', etch: '#d6e6f8', logo: 'linkedin' },
  whatsapp: { base: '#25d366', seam: '#0c5a2c', etch: '#eafff2', logo: 'whatsapp' },
};

export function createBrandBall(kind, radius = 1) {
  const { map, bumpMap } = brandBallTextures(BRAND[kind]);
  const mat = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 2.2, roughness: 0.62, metalness: 0.02 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat);
  mesh.userData.kind = kind;
  return mesh;
}

const CAM_Y = 1.4;
const ROOM = { x: 2.6, y: 3.0, zBack: -4.2, zFront: 1.6, step: 0.4 };
const HOOP_POS = V(0, CAM_Y + 0.95, ROOM.zBack);
const BOARD_Z = 0.8;

export function buildGridRoom(scene) {
  const { x: X, y: Y, zBack: Z0, zFront: Z1, step } = ROOM;
  const grid = [], edges = [];
  const push = (arr, a, b) => {
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / step));
    for (let i = 0; i < n; i++) { const p = a.clone().lerp(b, i / n), q = a.clone().lerp(b, (i + 1) / n); arr.push(p.x, p.y, p.z, q.x, q.y, q.z); }
  };
  const range = (a, b) => { const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-6; v += step) out.push(+v.toFixed(4)); return out; };
  for (const y of [0, Y]) {
    range(-X, X).forEach((x) => push(grid, V(x, y, Z0), V(x, y, Z1)));
    range(Z0, Z1).forEach((z) => push(grid, V(-X, y, z), V(X, y, z)));
  }
  for (const x of [-X, X]) {
    range(0, Y).forEach((y) => push(grid, V(x, y, Z0), V(x, y, Z1)));
    range(Z0, Z1).forEach((z) => push(grid, V(x, 0, z), V(x, Y, z)));
  }
  for (const z of [Z0, Z1]) {
    range(0, Y).forEach((y) => push(grid, V(-X, y, z), V(X, y, z)));
    range(-X, X).forEach((x) => push(grid, V(x, 0, z), V(x, Y, z)));
  }
  const c = [V(-X, 0, Z0), V(X, 0, Z0), V(X, Y, Z0), V(-X, Y, Z0), V(-X, 0, Z1), V(X, 0, Z1), V(X, Y, Z1), V(-X, Y, Z1)];
  [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => push(edges, c[a], c[b]));
  const lines = (arr, color, opacity) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, fog: true, depthWrite: false });
    scene.add(new THREE.LineSegments(g, m)); return m;
  };
  return [lines(grid, '#8a93a6', 0.42), lines(edges, '#c9cfdb', 0.75)];
}

const RIM_ORANGE = '#ff7a2e', NEON_PURPLE = '#8f4dff';

function glowTexture() {
  const [c, g] = makeCanvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function createHoop() {
  const group = new THREE.Group();
  const mats = [], glows = [];
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); mats.push(m); return m; };
  // Additive glow layers fade with the room but keep their own base opacity.
  const glow = (o, opacity) => { const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, ...o, opacity }); glows.push([m, opacity]); return m; };
  // Board face is baked artwork: neutral concrete with light grey court lines.
  const loader = new THREE.TextureLoader();
  const face = loader.load('./assets/textures/backboard.png'); face.colorSpace = THREE.SRGBColorSpace; face.anisotropy = 8;
  const W = 1.12, H = 0.72, T = 0.035;
  const side = std({ color: '#6f6b66', roughness: 0.8 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [side, side, side, side, std({ map: face, roughness: 0.85, metalness: 0 }), std({ color: '#55524e', roughness: 0.8 })]);
  board.position.set(0, 0, BOARD_Z); group.add(board);
  // Mild purple backlight: a soft additive halo behind the board so its edges glow against the wall.
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.1, H * 2.4), glow({ map: glowTexture(), color: NEON_PURPLE }, 0.55));
  back.position.set(0, 0, BOARD_Z - T / 2 - 0.04); group.add(back);
  const steel = std({ color: '#35353a', roughness: 0.55, metalness: 0.6 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.02), steel); plate.position.set(0, -0.12, 0.01); group.add(plate);
  const strut = (from, to, r = 0.016) => { const len = from.distanceTo(to), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), steel); m.position.copy(from).add(to).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), to.clone().sub(from).normalize()); group.add(m); };
  [-0.16, 0.16].forEach((x) => { strut(V(x, 0.06, 0.02), V(x, 0.06, BOARD_Z - 0.02)); strut(V(x, -0.34, 0.02), V(x, 0.02, BOARD_Z - 0.3)); });
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.02), steel); backPlate.position.set(0, 0.02, BOARD_Z - 0.03); group.add(backPlate);
  const RIM_R = 0.23, rimY = -H / 2 + 0.06, rimZ = BOARD_Z + T / 2 + 0.02 + RIM_R;
  // Orange rim with a slight inner glow, one faint additive sheath, and a soft warm light on the board and net.
  const rimMat = std({ color: RIM_ORANGE, emissive: RIM_ORANGE, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.3 });
  [[rimMat, 0.012], [glow({ color: RIM_ORANGE }, 0.12), 0.026]].forEach(([mat, tube]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RIM_R, tube, 16, 96), mat); ring.rotation.x = Math.PI / 2; ring.position.set(0, rimY, rimZ); group.add(ring);
  });
  const rimLight = new THREE.PointLight(RIM_ORANGE, 0.12, 1.4, 2); rimLight.position.set(0, rimY + 0.04, rimZ - 0.05); group.add(rimLight);
  const hardware = std({ color: '#4a4a4f', roughness: 0.5, metalness: 0.6 });
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.012), hardware); mount.position.set(0, rimY + 0.05, BOARD_Z + T / 2 + 0.006); group.add(mount);
  [-0.07, 0.07].forEach((x) => { const brace = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.05), hardware); brace.position.set(x, rimY, BOARD_Z + T / 2 + 0.03); group.add(brace); });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const hk = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.006), hardware); hk.position.set(Math.cos(a) * RIM_R, rimY - 0.01, rimZ + Math.sin(a) * RIM_R); group.add(hk); }
  const netGeos = [], NS = 12, NL = 0.42;
  const radiusAt = (t) => RIM_R * (1 - t * 0.42) - Math.sin(t * Math.PI) * 0.01;
  for (let i = 0; i < NS; i++) for (const dir of [1, -1]) { const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8, a = ((i + dir * t * 1.6) / NS) * Math.PI * 2; pts.push(V(Math.cos(a) * radiusAt(t), -t * NL, Math.sin(a) * radiusAt(t))); } netGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0032, 5)); }
  [0.5, 1].forEach((t) => { const pts = []; for (let k = 0; k <= 48; k++) { const a = (k / 48) * Math.PI * 2; pts.push(V(Math.cos(a) * radiusAt(t), -t * NL, Math.sin(a) * radiusAt(t))); } netGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 48, 0.003, 5, true)); });
  const net = new THREE.Mesh(mergeGeometries(netGeos), std({ color: '#e6e3df', roughness: 0.95 })); net.position.set(0, rimY, rimZ); group.add(net);
  group.position.copy(HOOP_POS);
  let fade = 1, lastT = 0, swishAt = -10;
  const rimCenter = V(HOOP_POS.x, HOOP_POS.y + rimY, HOOP_POS.z + rimZ);
  return {
    group, materials: mats, rim: { center: rimCenter, radius: RIM_R, netLength: NL },
    update(t) {
      lastT = t;
      // Swish: the net stretches and wobbles for a moment after a ball drops through, then settles.
      const s = t - swishAt, kick = s >= 0 && s < 1.2 ? Math.exp(-s * 4.5) : 0;
      net.rotation.y = Math.sin(t * 0.7) * 0.05 + kick * Math.sin(s * 22) * 0.12; net.scale.y = 1 + Math.sin(t * 1.3) * 0.01 + kick * 0.22;
      const hum = 0.94 + Math.sin(t * 2.1) * 0.06;
      glows.forEach(([m, base]) => { m.opacity = base * fade * hum; }); rimLight.intensity = 0.12 * fade * hum;
    },
    swish() { swishAt = lastT; },
    setOpacity(o) { fade = o; mats.forEach((m) => { m.transparent = o < 1; m.opacity = o; m.depthWrite = o > 0.5; }); },
  };
}

export function addLights(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight('#ffffff', '#1b1d24', 0.7));
  const key = new THREE.DirectionalLight('#fff6ec', 2.4); key.position.set(1.5, 4, 3); scene.add(key);
  const fill = new THREE.DirectionalLight('#b9c6ff', 0.6); fill.position.set(-3, 1, 1); scene.add(fill);
}

export const lensFor = (aspect) => (aspect < 0.8 ? 62 : 50);

export function computeBallLayout(camera, W, H, { pad = 16, gap = 16, depth = 1.35, yFrac = 0.63, maxFrac = 0.26 } = {}) {
  const D = Math.min((W - 2 * pad - gap) / 2, H * maxFrac);
  const f = H / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const yc = H / 2 - yFrac * H;
  return [-1, 1].map((sgn) => {
    const cx = sgn * (gap / 2 + D / 2);
    const t1 = Math.atan((cx - D / 2) / f), t2 = Math.atan((cx + D / 2) / f);
    const tc = (t1 + t2) / 2, half = (t2 - t1) / 2;
    const x = depth * Math.tan(tc), y = depth * (yc / f);
    const dist = Math.hypot(x, y, depth);
    return { pos: V(camera.position.x + x, camera.position.y + y, camera.position.z - depth), r: dist * Math.sin(half) };
  });
}

export { CAM_Y, ROOM, HOOP_POS, RIM_ORANGE };
