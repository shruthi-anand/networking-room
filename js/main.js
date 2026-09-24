import * as THREE from 'three';
import { addLights, BRAND, buildGridRoom, computeBallLayout, createBrandBall, createHoop, lensFor, brandBallTextures, CAM_Y } from './core.js';
import { createBasketballLoadIn } from './load-in.js';
import { createLookHint, LookAroundControls } from './look-around.js';
import { CONFIG, getWhatsAppUrl } from './config.js';
import './scoreboard.js';
import { createWallBio } from './wall-bio.js';

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
const wallBio = createWallBio(renderer.capabilities.getMaxAnisotropy());
scene.add(wallBio.mesh);
const roomMats = [...buildGridRoom(scene), wallBio.material];
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
shotPrompt.textContent = CONFIG.SHOT_PROMPT;
const connectHint = document.getElementById('connectHint');
const isCoarse = matchMedia('(pointer: coarse)').matches;
const motionCapable = isCoarse && typeof window.DeviceOrientationEvent !== 'undefined';
const SWIPE_ONCE_MS = 3300; // icon draw-in (900ms) + one swipe cycle (2.4s), see .swipe-finger in style.css
let look = null;
let motionState = 'idle';
let interactive = false;
let balls = [];
let ballState = [];
let focusedBall = null;
let selectedBall = null;
let ballsLocked = false;
let suppressCanvasClick = false;
let haloBall = null;
let connectStart = null;

// Selected ball: pulled toward the camera and centre, scaled up, wrapped in a game-style selection halo.
const SELECT_PULL = 0.3, SELECT_CENTER = 0.9, SELECT_SCALE = 0.38, HALO_SHELL = 1.32;
const HALO_COLOR = { linkedin: '#8fc0ff', whatsapp: '#8dffc0' };
const selectTarget = new THREE.Vector3();
// Back-face shell around the ball. vRho is the distance from the ball centre to the view ray in ball radii,
// so rho = 1 is exactly the ball's silhouette: a crisp bright edge there, fading out to the shell.
const halo = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 32),
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#ffffff') }, uShell: { value: HALO_SHELL }, uStrength: { value: 0 } },
    vertexShader: `uniform float uShell; varying float vRho;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = dot(normalize(normalMatrix * normal), normalize(-mv.xyz));
        vRho = uShell * sqrt(max(0.0, 1.0 - d * d)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uShell, uStrength; varying float vRho;
      void main() { float t = clamp((vRho - 1.0) / (uShell - 1.0), 0.0, 1.0);
        float line = 1.0 - smoothstep(0.0, 0.07, t); float soft = pow(1.0 - t, 2.6);
        gl_FragColor = vec4(mix(uColor, vec3(1.0), line * 0.75) * (soft * 0.8 + line) * uStrength, 1.0); }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
);
halo.visible = false;

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
  ballState = balls.map((ball, i) => ({ base: new THREE.Vector3(), yaw: 0, bob: 0, emphasis: 0, lift: 0, ph: i * 1.7 }));
  balls.forEach((ball) => scene.add(ball));
  scene.add(halo);
  look = new LookAroundControls(camera, canvas, { yawLimit: 18, pitchLimit: 8 });
  const hint = createLookHint(hintButton, {
    mode: isCoarse ? 'swipe' : 'drag',
    title: isCoarse ? 'Swipe to look around' : 'Drag to look around',
    onTap() {
      if (!motionCapable || !look) return;
      if (motionState === 'granted') { look.recenter(); hint.set({ title: 'Tilt to look around', sub: 'View recentered' }); return; }
      if (motionState === 'pending') { hint.open(Infinity); return; }
      motionState = 'pending';
      hint.set({ mode: 'tilt', title: 'Allow motion', sub: '' });
      hint.open(Infinity);
      look.enableMotion().then((result) => {
        motionState = result;
        if (result === 'granted') hint.set({ mode: 'tilt', title: 'Tilt to look around', sub: 'Tap to recenter' });
        else if (result === 'denied') hint.set({ mode: 'swipe', title: 'Swipe to look around', sub: 'Motion is off' });
        else hint.set({ mode: 'swipe', title: 'Swipe to look around', sub: 'Motion is unavailable' });
        hint.open(3200);
      });
    },
  });
  if (motionCapable) {
    // Phones: play the swipe gesture once, then stay expanded on the tilt prompt until motion is sorted out.
    hint.open(Infinity);
    setTimeout(() => {
      if (motionState !== 'idle') return;
      hint.set({ mode: 'tilt', title: 'Tap to enable motion', sub: 'Tilt your phone to look around' });
      hint.redraw();
    }, SWIPE_ONCE_MS);
  } else {
    hint.open();
  }
  layout();
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pickBall(event) {
  pointer.x = (event.clientX / innerWidth) * 2 - 1; pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(balls)[0]?.object || null;
}

function positionConnectHint(ball) {
  const projected = ball.position.clone().project(camera);
  const x = (projected.x + 1) * 0.5 * innerWidth;
  const y = (-projected.y + 1) * 0.5 * innerHeight;
  const distance = camera.position.distanceTo(ball.position);
  const radius = ball.scale.x * innerHeight / (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  connectHint.style.setProperty('--ball-x', `${x}px`);
  connectHint.style.setProperty('--ball-y', `${y - radius - 18}px`);
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
  haloBall = ball;
  halo.material.uniforms.uColor.value.set(HALO_COLOR[ball.userData.kind]);
  focusedBall = ball;
  balls.forEach((item) => { item.userData.focused = item === ball; });
  shotPrompt.hidden = false;
  connectHint.hidden = false;
  positionConnectHint(ball);
  titleEl.classList.remove('is-returning');
  titleEl.classList.add('is-wireframe');
}

function resetSelection() {
  selectedBall = null;
  ballsLocked = false;
  focusedBall = null;
  balls.forEach((item) => { item.userData.focused = false; });
  shotPrompt.hidden = true;
  connectHint.hidden = true;
  // Back on the resting screen, so bring the title back.
  if (titleEl.classList.contains('is-wireframe')) {
    titleEl.classList.remove('is-wireframe');
    void titleEl.offsetWidth;
    titleEl.classList.add('is-returning');
  }
}

function activateBall(ball) {
  if (!ball) return;
  const url = ball.userData.kind === 'linkedin' ? CONFIG.LINKEDIN_URL : getWhatsAppUrl();
  window.open(url, '_blank', 'noopener');
  resetSelection();
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
    else connectStart = { x: event.clientX, y: event.clientY };
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
window.addEventListener('pointerup', (event) => {
  if (!connectStart || !selectedBall) { connectStart = null; return; }
  const distance = connectStart.y - event.clientY;
  connectStart = null;
  if (distance > 48) activateBall(selectedBall);
});

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
      const selected = ball === selectedBall;
      state.emphasis += ((ball.userData.focused && !selected ? 1 : 0) - state.emphasis) * 0.16;
      state.lift += ((selected ? 1 : 0) - state.lift) * 0.12;
      ball.position.set(state.base.x, state.base.y + Math.sin(t * 1.1 + state.ph) * state.bob * (1 - state.lift * 0.6), state.base.z);
      if (state.lift > 0.001) {
        selectTarget.copy(ball.position).lerp(camera.position, SELECT_PULL);
        selectTarget.x = THREE.MathUtils.lerp(state.base.x, camera.position.x, SELECT_CENTER);
        ball.position.lerp(selectTarget, state.lift);
      }
      ball.rotation.set(0.1, state.yaw + t * 0.42, 0.05);
      ball.scale.setScalar(state.r * (1 + state.emphasis * 0.1 + state.lift * SELECT_SCALE));
      if (selected) positionConnectHint(ball);
    });
    const haloLift = haloBall ? ballState[balls.indexOf(haloBall)].lift : 0;
    halo.visible = haloLift > 0.01;
    if (halo.visible) {
      halo.position.copy(haloBall.position);
      halo.scale.setScalar(haloBall.scale.x * HALO_SHELL);
      halo.material.uniforms.uStrength.value = haloLift * (0.85 + Math.sin(t * 4) * 0.15);
    }
    look?.update(clock.getDelta()); hoop.update(t);
  }
  renderer.render(scene, camera);
});
