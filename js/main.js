import * as THREE from 'three';
import { addLights, BRAND, buildGridRoom, computeBallLayout, createBrandBall, createHoop, lensFor, brandBallTextures, CAM_Y } from './core.js';
import { createBasketballLoadIn } from './load-in.js';
import { createLookHint, LookAroundControls } from './look-around.js';
import { CONFIG, getWhatsAppUrl } from './config.js';

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#000000');
scene.fog = new THREE.Fog('#000000', 5, 13);
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 30);
camera.position.set(0, CAM_Y, 0.4);
camera.lookAt(0, CAM_Y, -1);
addLights(scene, renderer);
const roomMats = buildGridRoom(scene);
const roomOpacity = roomMats.map((m) => m.opacity);
const hoop = createHoop();
scene.add(hoop.group);

const intros = [
  createBasketballLoadIn({ textures: brandBallTextures(BRAND.linkedin), seamColor: '#8fc0ff' }),
  createBasketballLoadIn({ textures: brandBallTextures(BRAND.whatsapp), seamColor: '#8dffc0', delay: 0.18 }),
];
intros.forEach((ball) => scene.add(ball.group));
const base = intros.map((_, i) => ({ pos: new THREE.Vector3(), r: 1, ph: i * 1.7 }));
const titleEl = document.getElementById('pageTitle');
const replayBtn = document.getElementById('replay');
const hintButton = document.getElementById('lookHint');
const statusEl = document.getElementById('status');
const isCoarse = matchMedia('(pointer: coarse)').matches;
const motionCapable = isCoarse && typeof window.DeviceOrientationEvent !== 'undefined';
let look = null;
let motionState = 'idle';
let interactive = false;
let balls = [];
let ballState = [];

function layout() {
  computeBallLayout(camera, window.innerWidth, window.innerHeight).forEach(({ pos, r }, i) => {
    base[i].pos.copy(pos); base[i].r = r;
    if (intros[i]) intros[i].group.scale.setScalar(r);
    if (balls[i]) { balls[i].scale.setScalar(r); ballState[i].base.copy(pos); ballState[i].bob = r * 0.12; ballState[i].yaw = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) + i * Math.PI * 0.5; }
    intros[i]?.setYaw(Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) + i * Math.PI * 0.5);
  });
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = lensFor(camera.aspect); camera.updateProjectionMatrix(); layout();
}
window.addEventListener('resize', resize);
resize();

function startLookAround() {
  if (interactive) return;
  interactive = true;
  intros.forEach((intro) => scene.remove(intro.group));
  balls = [createBrandBall('linkedin'), createBrandBall('whatsapp')];
  ballState = balls.map((ball, i) => ({ base: new THREE.Vector3(), yaw: 0, bob: 0, ph: i * 1.7 }));
  balls.forEach((ball) => scene.add(ball));
  look = new LookAroundControls(camera, canvas, { yawLimit: 18, pitchLimit: 8 });
  const hint = createLookHint(hintButton, {
    mode: motionCapable ? 'tilt' : isCoarse ? 'swipe' : 'drag',
    title: motionCapable ? 'Tilt or swipe to look around' : isCoarse ? 'Swipe to look around' : 'Drag to look around',
    sub: motionCapable ? 'Tap here to use motion' : '',
    onTap() {
      if (!motionCapable || !look) return;
      if (motionState === 'granted') { look.recenter(); hint.set({ title: 'Tilt to look around', sub: 'View recentered' }); return; }
      hint.set({ title: 'Allow motion', sub: '' });
      look.enableMotion().then((result) => {
        motionState = result;
        if (result === 'granted') hint.set({ mode: 'tilt', title: 'Tilt to look around', sub: 'Tap to recenter' });
        else if (result === 'denied') hint.set({ mode: 'swipe', title: 'Swipe to look around', sub: 'Motion is off' });
        else hint.set({ mode: 'swipe', title: 'Swipe to look around', sub: 'Motion is unavailable' });
        hint.open(3200);
      });
    },
  });
  hint.open();
  layout();
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener('click', (event) => {
  if (!interactive || !balls.length) return;
  pointer.x = (event.clientX / innerWidth) * 2 - 1; pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const ball = raycaster.intersectObjects(balls)[0]?.object;
  if (!ball) return;
  const url = ball.userData.kind === 'linkedin' ? CONFIG.LINKEDIN_URL : getWhatsAppUrl();
  window.open(url, '_blank', 'noopener');
});

const clock = new THREE.Clock();
let start = performance.now();
let titleShown = false;
replayBtn.addEventListener('click', () => { window.location.reload(); });
renderer.setAnimationLoop(() => {
  const t = ((performance.now() - start) / 1000) * (matchMedia('(prefers-reduced-motion: reduce)').matches ? 3 : 1);
  let room = 0, allResolved = true;
  if (!interactive) {
    intros.forEach((intro, i) => {
      const s = base[i]; intro.group.position.set(s.pos.x, s.pos.y, s.pos.z);
      const progress = intro.update(t); intro.group.position.y = s.pos.y + Math.sin(t * 1.1 + s.ph) * s.r * 0.12 * progress.settle;
      room = Math.max(room, progress.room); allResolved = allResolved && progress.resolved;
    });
    roomMats.forEach((mat, i) => { mat.opacity = roomOpacity[i] * room; }); hoop.setOpacity(room); hoop.update(t);
    if (allResolved && !titleShown) { titleShown = true; titleEl.classList.add('is-in'); setTimeout(() => { replayBtn.classList.add('is-in'); startLookAround(); }, 900); }
  } else {
    balls.forEach((ball, i) => { const state = ballState[i]; ball.position.set(state.base.x, state.base.y + Math.sin(t * 1.1 + state.ph) * state.bob, state.base.z); ball.rotation.set(0.1, state.yaw + t * 0.42, 0.05); });
    look?.update(clock.getDelta()); hoop.update(t);
  }
  renderer.render(scene, camera);
});
