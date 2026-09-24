import * as THREE from 'three';
import { ROOM, RIM_ORANGE } from './core.js';
import { CONFIG } from './config.js';
import { createWallCard } from './wall-card.js';

// Bio aside on the right wall, centred on the wall: solid regular-weight type, with key words as heavy outlines
// (the accent outline uses the hoop's orange). Pieces and styling come from CONFIG.BIO.aside.
// Text is config-driven and drawn at runtime (see CLAUDE.md). The intro paragraph lives in the HUD (bio-ticker.js).
const PANEL = { w: 1.9, h: 1.6 };
const PX = 2048, PY = Math.round(PX * (PANEL.h / PANEL.w));
const FONT = "'Bricolage Grotesque', 'Avenir Next', 'Helvetica Neue', system-ui, sans-serif";
const TYPE = { size: 158, lineHeight: 1.16, stroke: 7, solidWeight: 400, outlineWeight: 800 };
const INK = '#fff6ec';
const PAD = 120;

const fontFor = (word) => `${word.outline ? TYPE.outlineWeight : TYPE.solidWeight} ${TYPE.size}px ${FONT}`;

// Words keep their piece's style; each is measured in its own weight so mixed lines wrap and centre correctly.
function layout(g, pieces, maxWidth) {
  g.font = `${TYPE.solidWeight} ${TYPE.size}px ${FONT}`;
  const space = g.measureText(' ').width;
  const lines = [];
  let line = null;
  const push = () => { if (line?.words.length) lines.push(line); line = { words: [], width: 0 }; };
  push();
  for (const piece of pieces) {
    if (piece.newLine) push();
    for (const text of piece.text.trim().split(/\s+/)) {
      g.font = fontFor(piece);
      const word = { ...piece, text, width: g.measureText(text).width };
      const added = (line.words.length ? space : 0) + word.width;
      if (line.words.length && line.width + added > maxWidth) push();
      line.width += (line.words.length ? space : 0) + word.width;
      line.words.push(word);
    }
  }
  push();
  return { lines, space };
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

  const { lines, space } = layout(g, CONFIG.BIO.aside, PX - PAD * 2);
  const step = TYPE.size * TYPE.lineHeight;
  const top = PY / 2 - ((lines.length - 1) * step) / 2;
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = TYPE.stroke;
  lines.forEach((line, i) => {
    let x = (PX - line.width) / 2;
    const y = top + i * step;
    for (const word of line.words) {
      g.font = fontFor(word);
      const color = word.accent ? RIM_ORANGE : INK;
      if (word.outline) { g.strokeStyle = color; g.strokeText(word.text, x, y); } else { g.fillStyle = color; g.fillText(word.text, x, y); }
      x += word.width + space;
    }
  });
}

export function createWallBio(anisotropy = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = PX; canvas.height = PY;
  draw(canvas);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
  // Redraw once both web-font weights are ready so the canvas never keeps the fallback face.
  Promise.all([TYPE.solidWeight, TYPE.outlineWeight].map((w) => document.fonts.load(`${w} ${TYPE.size}px 'Bricolage Grotesque'`)))
    .then(() => { draw(canvas); map.needsUpdate = true; })
    .catch(() => {});
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), material);
  mesh.rotation.y = -Math.PI / 2; // face into the room from the +x wall; text reads toward the front
  mesh.position.set(ROOM.x - 0.01, ROOM.y / 2, (ROOM.zBack + ROOM.zFront) / 2);
  const card = createWallCard(mesh, PANEL);
  return { mesh, material, group: card.group, update: card.update };
}
