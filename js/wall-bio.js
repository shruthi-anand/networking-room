import * as THREE from 'three';
import { ROOM } from './core.js';
import { CONFIG } from './config.js';

// Bio panel on the right wall. Text is config-driven and drawn at runtime (see CLAUDE.md).
// On portrait phones only the back stretch of the right wall comes into view (looking fully right),
// so the panel sits there and the type is sized for ~3-4m at a steep angle.
const PANEL = { w: 1.9, h: 1.45, zCenter: -3.22, yCenter: 1.5 };
const PX = 2048, PY = Math.round(PX * (PANEL.h / PANEL.w));
const FONT = "'Bricolage Grotesque', 'Avenir Next', 'Helvetica Neue', system-ui, sans-serif";
const MAIN = { weight: 700, size: 124, lineHeight: 1.12, color: '#fff6ec' };
const ASIDE = { weight: 500, size: 96, lineHeight: 1.24, color: '#ffab73', tilt: -0.02 };
const PAD = 110, GAP = 64;

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

  const maxWidth = PX - PAD * 2;
  g.font = `${MAIN.weight} ${MAIN.size}px ${FONT}`;
  const mainLines = wrap(g, CONFIG.WALL_BIO.main, maxWidth);
  g.font = `${ASIDE.weight} ${ASIDE.size}px ${FONT}`;
  const asideLines = wrap(g, CONFIG.WALL_BIO.aside, maxWidth * 0.94);
  const mainH = mainLines.length * MAIN.size * MAIN.lineHeight;
  const asideH = asideLines.length * ASIDE.size * ASIDE.lineHeight;
  let y = (PY - (mainH + GAP * 2 + asideH)) / 2;

  g.textBaseline = 'top'; g.fillStyle = MAIN.color;
  g.font = `${MAIN.weight} ${MAIN.size}px ${FONT}`;
  mainLines.forEach((line, i) => g.fillText(line, PAD, y + i * MAIN.size * MAIN.lineHeight));
  y += mainH + GAP;

  // Divider between the two tiers.
  g.fillStyle = 'rgba(255, 255, 255, 0.22)'; g.fillRect(PAD, y - 2, maxWidth * 0.34, 4);
  y += GAP;

  // Aside: lighter weight, warm accent, slight tilt for a looser, handwritten-note feel.
  g.save(); g.translate(PAD, y); g.rotate(ASIDE.tilt);
  g.fillStyle = ASIDE.color; g.font = `${ASIDE.weight} ${ASIDE.size}px ${FONT}`;
  asideLines.forEach((line, i) => g.fillText(line, 0, i * ASIDE.size * ASIDE.lineHeight));
  g.restore();
}

export function createWallBio(anisotropy = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = PX; canvas.height = PY;
  draw(canvas);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
  // Redraw once the web font is ready so the canvas never keeps the fallback face.
  Promise.all([MAIN, ASIDE].map((s) => document.fonts.load(`${s.weight} ${s.size}px 'Bricolage Grotesque'`)))
    .then(() => { draw(canvas); map.needsUpdate = true; })
    .catch(() => {});
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), material);
  mesh.rotation.y = -Math.PI / 2; // face into the room from the +x wall; text reads toward the front
  mesh.position.set(ROOM.x - 0.01, PANEL.yCenter, PANEL.zCenter);
  return { mesh, material };
}
