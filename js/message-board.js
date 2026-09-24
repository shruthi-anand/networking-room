import * as THREE from 'three';
import { ROOM } from './core.js';
import { createWallCard, WALL_PURPLE } from './wall-card.js';

// Guestbook panel on the left wall: baked art (text-bearing, see CLAUDE.md) mirrored from the right-wall sign,
// centred on the wall and sized to fit and read when a phone turns to face it. Tapping it opens the message overlay.
// The "Leave a Message" title is its own baked layer so it can be tinted purple and pulse softly.
const PANEL = { w: 1.9, h: 1.6 };

function texture(url, anisotropy) {
  const map = new THREE.TextureLoader().load(url);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
  return map;
}

export function createMessageBoard(anisotropy = 8) {
  const material = new THREE.MeshBasicMaterial({ map: texture('./assets/textures/message-board.png', anisotropy), transparent: true, toneMapped: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), material);
  const titleMat = new THREE.MeshBasicMaterial({ map: texture('./assets/textures/message-board-title.png', anisotropy), color: WALL_PURPLE, transparent: true, toneMapped: false, depthWrite: false });
  const title = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), titleMat);
  title.position.z = 0.003; title.renderOrder = 1;
  mesh.add(title);
  mesh.rotation.y = Math.PI / 2; // face into the room from the -x wall; text reads toward the back
  mesh.position.set(-ROOM.x + 0.01, ROOM.y / 2, (ROOM.zBack + ROOM.zFront) / 2);
  const card = createWallCard(mesh, PANEL);
  const purple = new THREE.Color(WALL_PURPLE);
  return {
    mesh, group: card.group, materials: [material, titleMat],
    update(camera, dt, t) {
      card.update(camera, dt, t);
      // Soft luminous pulse on the title, never brighter than the base purple.
      titleMat.color.copy(purple).multiplyScalar(0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2.2)));
    },
  };
}
