import * as THREE from 'three';

// Wall panels that come to life when the viewer turns toward them: they ease off the wall, grow slightly, pick up a
// faint purple border glow and hover gently; turning away settles them back flat on the wall.
export const WALL_PURPLE = '#b77bff';
const LIFT = 0.16, GROW = 0.06, GLOW = 0.5, HOVER = 0.012;
const FACE_START = Math.cos(THREE.MathUtils.degToRad(32)), FACE_FULL = Math.cos(THREE.MathUtils.degToRad(12));
const MARGIN = 0.14; // how far the glow reaches past the panel edge (m)

function glowRing(w, h, radius) {
  const PX = 1024, PY = Math.round(PX * ((h + MARGIN * 2) / (w + MARGIN * 2))), s = PX / (w + MARGIN * 2);
  const c = document.createElement('canvas'); c.width = PX; c.height = PY;
  const g = c.getContext('2d');
  g.strokeStyle = '#ffffff'; g.shadowColor = '#ffffff';
  const ring = (width, blur, alpha) => {
    g.globalAlpha = alpha; g.lineWidth = width; g.shadowBlur = blur;
    g.beginPath(); g.roundRect(MARGIN * s, MARGIN * s, w * s, h * s, radius * s); g.stroke();
  };
  ring(10, 40, 0.5); ring(3, 10, 0.9);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// panel: a plane already placed on the wall. Returns a group that replaces it in the scene, plus a per-frame update.
export function createWallCard(panel, { w, h, radius = 0.037 }) {
  const group = new THREE.Group();
  group.position.copy(panel.position); group.rotation.copy(panel.rotation);
  panel.position.set(0, 0, 0); panel.rotation.set(0, 0, 0);
  group.add(panel);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowRing(w, h, radius), color: WALL_PURPLE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w + MARGIN * 2, h + MARGIN * 2), glowMat);
  glow.position.z = -0.004; glow.renderOrder = -1;
  group.add(glow);

  const home = group.position.clone();
  const normal = new THREE.Vector3(0, 0, 1).applyEuler(group.rotation);
  const forward = new THREE.Vector3(), toCard = new THREE.Vector3();
  let focus = 0;

  return {
    group,
    // t: ambient clock (pauses while a ball is selected); dt in seconds.
    update(camera, dt, t) {
      camera.getWorldDirection(forward);
      toCard.copy(home).sub(camera.position).normalize();
      const target = THREE.MathUtils.smoothstep(forward.dot(toCard), FACE_START, FACE_FULL);
      focus += (target - focus) * (1 - Math.exp(-5 * Math.min(dt, 0.1)));
      const lift = LIFT * focus + HOVER * focus * Math.sin(t * 1.6);
      group.position.copy(home).addScaledVector(normal, lift);
      group.position.y += HOVER * 0.6 * focus * Math.sin(t * 1.1 + 1);
      group.scale.setScalar(1 + GROW * focus);
      glowMat.opacity = GLOW * focus;
      return focus;
    },
  };
}
