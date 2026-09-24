import * as THREE from 'three';
import { ROOM } from './core.js';

// Guestbook panel on the left wall: baked art (text-bearing, see CLAUDE.md) mirrored from the right-wall sign,
// centred on the wall and sized to fit and read when a phone turns to face it. Tapping it opens the message overlay.
const PANEL = { w: 1.9, h: 1.6 };

export function createMessageBoard(anisotropy = 8) {
  const map = new THREE.TextureLoader().load('./assets/textures/message-board.png');
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), material);
  mesh.rotation.y = Math.PI / 2; // face into the room from the -x wall; text reads toward the back
  mesh.position.set(-ROOM.x + 0.01, ROOM.y / 2, (ROOM.zBack + ROOM.zFront) / 2);
  return { mesh, material };
}
