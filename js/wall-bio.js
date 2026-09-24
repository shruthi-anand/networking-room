import * as THREE from 'three';
import { ROOM } from './core.js';
import { CONFIG } from './config.js';

// Bio aside on the right wall: plain white outline (wireframe) type, centred on the wall.
// Text is config-driven and drawn at runtime (see CLAUDE.md). The intro paragraph lives in the HUD (bio-ticker.js).
const PANEL = { w: 1.9, h: 1.6 };
const PX = 2048, PY = Math.round(PX * (PANEL.h / PANEL.w));
const FONT = "'Bricolage Grotesque', 'Avenir Next', 'Helvetica Neue', system-ui, sans-serif";
const TYPE = { weight: 800, size: 158, lineHeight: 1.16, stroke: 7 };
const OUTLINE = '#fff6ec';
const PAD = 120;

function wrap(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > maxWidth) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function draw(canvas) {
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, PX, PY);
  // Housing: translucent dark glass, thin white border, faint inner frame line.
  g.fillStyle = 'rgba(12, 13, 18, 0.74)';
  g.beginPath(); g.roundRect(6, 6, PX - 12, PY - 12, 40); g.fill();
  g.lineWidth = 6; g.strokeStyle = 'rgba(255, 255, 255, 0.42)'; g.stroke();
  g.lineWidth = 3; g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  g.beginPath(); g.roundRect(34, 34, PX - 68, PY - 68, 24); g.stroke();

  g.font = `${TYPE.weight} ${TYPE.size}px ${FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const lines = wrap(g, CONFIG.BIO.aside, PX - PAD * 2);
  const step = TYPE.size * TYPE.lineHeight;
  const top = PY / 2 - ((lines.length - 1) * step) / 2;
  // Single clean white outline, no glow: stays crisp and readable on small screens.
  g.strokeStyle = OUTLINE; g.lineWidth = TYPE.stroke;
  lines.forEach((line, i) => g.strokeText(line, PX / 2, top + i * step));
}

export function createWallBio(anisotropy = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = PX; canvas.height = PY;
  draw(canvas);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
  // Redraw once the web font is ready so the canvas never keeps the fallback face.
  document.fonts.load(`${TYPE.weight} ${TYPE.size}px 'Bricolage Grotesque'`)
    .then(() => { draw(canvas); map.needsUpdate = true; })
    .catch(() => {});
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), material);
  mesh.rotation.y = -Math.PI / 2; // face into the room from the +x wall; text reads toward the front
  mesh.position.set(ROOM.x - 0.01, ROOM.y / 2, (ROOM.zBack + ROOM.zFront) / 2);
  return { mesh, material };
}
