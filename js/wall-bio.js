import * as THREE from 'three';
import { ROOM } from './core.js';
import { WALL_PURPLE } from './wall-card.js';
import { CONFIG } from './config.js';

// Bio aside on the right wall, centred on the wall: solid regular-weight type; accent pieces sit on their own layer so
// they can glow softly in the wall purple and pulse. The panel has a steady purple outline (no pulse, no float). Pieces and styling come from CONFIG.BIO.aside.
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

// layer 'base': housing + all non-accent words. layer 'accent': accent words only, white with a soft halo, on transparent
// (tinted orange and pulsed by its material). Both use the same layout so the words line up exactly.
function draw(canvas, layer = 'base') {
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, PX, PY);
  const { lines, space } = layout(g, CONFIG.BIO.aside, PX - PAD * 2);
  const step = TYPE.size * TYPE.lineHeight;
  const top = PY / 2 - ((lines.length - 1) * step) / 2;
  const eachWord = (fn) => lines.forEach((line, i) => {
    let x = (PX - line.width) / 2;
    for (const word of line.words) { fn(word, x, top + i * step); x += word.width + space; }
  });
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = TYPE.stroke;
  if (layer === 'accent') {
    eachWord((word, x, y) => {
      if (!word.accent) return;
      g.font = fontFor(word); g.fillStyle = '#ffffff';
      g.shadowColor = 'rgba(255, 255, 255, 0.55)'; g.shadowBlur = 30; g.fillText(word.text, x, y);
      g.shadowBlur = 0; g.fillText(word.text, x, y);
    });
    return;
  }
  // Housing: translucent dark glass, thin white border, faint inner frame line.
  g.fillStyle = 'rgba(12, 13, 18, 0.74)';
  g.beginPath(); g.roundRect(6, 6, PX - 12, PY - 12, 40); g.fill();
  g.lineWidth = 7; g.strokeStyle = WALL_PURPLE; g.stroke();
  g.lineWidth = 3; g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  g.beginPath(); g.roundRect(34, 34, PX - 68, PY - 68, 24); g.stroke();

  eachWord((word, x, y) => {
    if (word.accent) return;
    g.font = fontFor(word);
    if (word.outline) { g.strokeStyle = INK; g.strokeText(word.text, x, y); } else { g.fillStyle = INK; g.fillText(word.text, x, y); }
  });
}

function layerTexture(layer, anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = PX; canvas.height = PY;
  draw(canvas, layer);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
  // Redraw once both web-font weights are ready so the canvas never keeps the fallback face.
  Promise.all([TYPE.solidWeight, TYPE.outlineWeight].map((w) => document.fonts.load(`${w} ${TYPE.size}px 'Bricolage Grotesque'`)))
    .then(() => { draw(canvas, layer); map.needsUpdate = true; })
    .catch(() => {});
  return map;
}

export function createWallBio(anisotropy = 8) {
  const material = new THREE.MeshBasicMaterial({ map: layerTexture('base', anisotropy), transparent: true, toneMapped: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), material);
  const accentMat = new THREE.MeshBasicMaterial({ map: layerTexture('accent', anisotropy), color: WALL_PURPLE, transparent: true, toneMapped: false, depthWrite: false });
  const accent = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), accentMat);
  accent.position.z = 0.003; accent.renderOrder = 1;
  mesh.add(accent);
  mesh.rotation.y = -Math.PI / 2; // face into the room from the +x wall; text reads toward the front
  mesh.position.set(ROOM.x - 0.01, ROOM.y / 2, (ROOM.zBack + ROOM.zFront) / 2);
  // Stays flat on the wall (no float or glow on approach): it is read-only, so it should not look tappable.
  const purple = new THREE.Color(WALL_PURPLE);
  return {
    mesh, group: mesh, materials: [material, accentMat],
    update(camera, dt, t) {
      // Same soft luminous pulse as the guestbook title, never brighter than the base purple.
      accentMat.color.copy(purple).multiplyScalar(0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2.2)));
    },
  };
}
