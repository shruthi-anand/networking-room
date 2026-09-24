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
const hintButton = document.getElementById('lookHint');
const shotPrompt = document.getElementById('shotPrompt');
const swishButton = document.getElementById('swishButton');
const isCoarse = matchMedia('(pointer: coarse)').matches;
const motionCapable = isCoarse && typeof window.DeviceOrientationEvent !== 'undefined';
let look = null;
let motionState = 'idle';
let interactive = false;
let balls = [];
let ballState = [];
let focusedBall = null;
let selectedBall = null;
let ballsLocked = false;
let suppressCanvasClick = false;
let selectionGlow = null;
let selectionRings = null;

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function layout() {
  computeBallLayout(camera, window.innerWidth, window.innerHeight).forEach(({ pos, r }, i) => {
    base[i].pos.copy(pos); base[i].r = r;
    if (intros[i]) intros[i].group.scale.setScalar(r);
    if (balls[i]) { balls[i].scale.setScalar(r); ballState[i].base.copy(pos); ballState[i].r = r; ballState[i].bob = r * 0.12; ballState[i].yaw = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) + i * Math.PI * 0.5; }
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
  ballState = balls.map((ball, i) => ({ base: new THREE.Vector3(), yaw: 0, bob: 0, emphasis: 0, ph: i * 1.7 }));
  balls.forEach((ball) => scene.add(ball));
  selectionGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: '#ffd27a',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  scene.add(selectionGlow);
  selectionRings = new THREE.Group();
  [0.52, 0.7, 0.88].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.018, 8, 64),
      new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.userData.phase = index * 0.7;
    selectionRings.add(ring);
  });
  scene.add(selectionRings);
  look = new LookAroundControls(camera, canvas, { yawLimit: 18, pitchLimit: 8 });
  const hint = createLookHint(hintButton, {
    mode: motionCapable ? 'tilt' : isCoarse ? 'swipe' : 'drag',
    title: motionCapable ? 'Swipe to look around' : isCoarse ? 'Swipe to look around' : 'Drag to look around',
    sub: motionCapable ? 'Tap to enable tilt' : '',
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
function pickBall(event) {
  pointer.x = (event.clientX / innerWidth) * 2 - 1; pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(balls)[0]?.object || null;
}

function positionSwish(ball) {
  const index = balls.indexOf(ball);
  const state = ballState[index];
  const projected = ball.position.clone().project(camera);
  const x = (projected.x + 1) * 0.5 * innerWidth;
  const y = (-projected.y + 1) * 0.5 * innerHeight;
  const distance = camera.position.distanceTo(ball.position);
  const radius = state.r * innerHeight / (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  swishButton.style.left = `${x - radius}px`;
  swishButton.style.top = `${y - radius}px`;
  swishButton.style.width = `${radius * 2}px`;
  swishButton.style.height = `${radius * 2}px`;
}

function focusBall(ball) {
  if (ballsLocked) return;
  if (!ball) {
    focusedBall = null;
    balls.forEach((item) => { item.userData.focused = false; });
    return;
  }
  focusedBall = ball;
  balls.forEach((item) => { item.userData.focused = item === ball; });
}

function selectBall(ball) {
  if (!ball || ballsLocked) return;
  ballsLocked = true;
  selectedBall = ball;
  focusedBall = ball;
  balls.forEach((item) => { item.userData.focused = item === ball; });
  shotPrompt.hidden = false;
  swishButton.hidden = false;
  swishButton.setAttribute('aria-label', `Swish with ${ball.userData.kind}`);
  positionSwish(ball);
  titleEl.classList.add('is-wireframe');
}

function resetSelection() {
  selectedBall = null;
  ballsLocked = false;
  focusedBall = null;
  balls.forEach((item) => { item.userData.focused = false; });
  shotPrompt.hidden = true;
  swishButton.hidden = true;
  if (selectionGlow) selectionGlow.material.opacity = 0;
  if (selectionRings) selectionRings.visible = false;
}

function activateBall(ball) {
  if (!ball) return;
  const url = ball.userData.kind === 'linkedin' ? CONFIG.LINKEDIN_URL : getWhatsAppUrl();
  window.open(url, '_blank', 'noopener');
}

canvas.addEventListener('pointermove', (event) => {
  if (!interactive || isCoarse) return;
  focusBall(pickBall(event));
});
canvas.addEventListener('pointerdown', (event) => {
  if (!interactive) return;
  const ball = pickBall(event);
  if (selectedBall) {
    if (ball !== selectedBall) resetSelection();
    suppressCanvasClick = true;
  } else if (ball) {
    selectBall(ball); suppressCanvasClick = true;
  }
});
canvas.addEventListener('click', (event) => {
  if (suppressCanvasClick) { suppressCanvasClick = false; return; }
  if (!interactive) return;
  const ball = pickBall(event);
  if (selectedBall) {
    if (ball !== selectedBall) resetSelection();
  } else {
    selectBall(ball);
  }
});
swishButton.addEventListener('click', () => activateBall(focusedBall));

const clock = new THREE.Clock();
let start = performance.now();
let titleShown = false;
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
    if (allResolved && !titleShown) { titleShown = true; titleEl.classList.add('is-in'); startLookAround(); }
  } else {
    balls.forEach((ball, i) => {
      const state = ballState[i];
      state.emphasis += ((ball.userData.focused ? 1 : 0) - state.emphasis) * 0.16;
      if (ball !== selectedBall) {
        ball.position.set(state.base.x, state.base.y + Math.sin(t * 1.1 + state.ph) * state.bob, state.base.z);
        ball.rotation.set(0.1, state.yaw + t * 0.42, 0.05);
      }
      ball.scale.setScalar(state.r * (1 + state.emphasis * (ball === selectedBall ? 0.18 : 0.1)));
      ball.material.emissive.set('#ffd27a');
      ball.material.emissiveIntensity = state.emphasis * (ball === selectedBall ? 0.25 : 0.08);
      if (ball === selectedBall) positionSwish(ball);
    });
    if (selectedBall && selectionGlow && selectionRings) {
      const pulse = selectedBall ? 1 + Math.sin(t * 3.2) * 0.08 : 0.9;
      const selectedState = ballState[balls.indexOf(selectedBall)];
      const selectedColor = selectedBall.userData.kind === 'linkedin' ? '#4a9dff' : '#59f28a';
      selectionGlow.material.color.set(selectedColor);
      selectionGlow.material.opacity = 0.58 * pulse;
      selectionGlow.position.set(selectedBall.position.x, selectedBall.position.y, selectedBall.position.z - selectedState.r * 0.48);
      selectionGlow.scale.setScalar(selectedState.r * 2.4 * pulse);
      selectionRings.visible = true;
      selectionRings.position.set(selectedBall.position.x, selectedBall.position.y - selectedState.r * 1.12, selectedBall.position.z);
      selectionRings.scale.setScalar(selectedState.r * 0.72 * pulse);
      selectionRings.children.forEach((ring) => {
        ring.material.color.set(selectedColor);
        ring.material.opacity = 0.52 * (0.8 + Math.sin(t * 3.2 + ring.userData.phase) * 0.2);
      });
    } else {
      if (selectionGlow) selectionGlow.material.opacity = 0;
      if (selectionRings) selectionRings.visible = false;
    }
    if (!selectedBall && selectionRings) {
      selectionRings.visible = false;
    }
    look?.update(clock.getDelta()); hoop.update(t);
  }
  renderer.render(scene, camera);
});
