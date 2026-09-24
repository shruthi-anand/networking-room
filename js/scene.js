import * as THREE from 'three';
import { CONFIG, getWhatsAppUrl } from './config.js';
import { createCameraControls } from './camera-controls.js';
import { createWhiteboardTexture } from './whiteboard-texture.js';
import { throwBall } from './ball-animation.js';

const app = document.querySelector('#app');
const loading = document.querySelector('#loading');
const status = document.querySelector('#status');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d9e2df');

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 2.7, 8.8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
app.append(renderer.domElement);
const controls = createCameraControls(camera, renderer.domElement);

scene.add(new THREE.HemisphereLight('#fff8ec', '#6d777b', 2.2));
const keyLight = new THREE.DirectionalLight('#fff1d2', 3);
keyLight.position.set(-4, 8, 5);
keyLight.castShadow = true;
scene.add(keyLight);

function addBox(size, position, color, materialOptions = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, ...materialOptions }));
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

addBox([18, 0.2, 14], [0, 0, 0], '#bda894');
addBox([18, 7, 0.2], [0, 3.5, -5], '#f0d8bd');
addBox([0.2, 7, 14], [-9, 3.5, 0], '#d4e0d4');
addBox([0.2, 7, 14], [9, 3.5, 0], '#d4e0d4');
addBox([6.8, 0.35, 2], [0, 2.2, 2.1], '#76533f');
addBox([0.18, 2.4, 1.4], [-2.2, 3.55, -4.75], '#9d6e4d');
const board = addBox([5.2, 2.6, 0.12], [2.6, 3.5, -4.82], '#f6f0df');
board.material.map = createWhiteboardTexture();
board.material.needsUpdate = true;

const hoopGroup = new THREE.Group();
hoopGroup.position.set(0, 5, -4.65);
const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 12, 32), new THREE.MeshStandardMaterial({ color: '#e56b32' }));
const backboard = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.6, 0.12), new THREE.MeshStandardMaterial({ color: '#f5e8d4' }));
backboard.position.z = -0.15;
hoopGroup.add(backboard, rim);
scene.add(hoopGroup);

function createBall(color, label, x) {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), new THREE.MeshStandardMaterial({ color }));
  ball.position.set(x, 2.75, 1.8);
  ball.castShadow = true;
  ball.userData.label = label;
  scene.add(ball);
  return ball;
}
const linkedinBall = createBall('#0a66c2', 'LinkedIn', -1.1);
const whatsappBall = createBall('#25d366', 'WhatsApp', 1.1);
const clickableBalls = [linkedinBall, whatsappBall];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let busy = false;

renderer.domElement.addEventListener('click', (event) => {
  if (busy) return;
  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const ball = raycaster.intersectObjects(clickableBalls)[0]?.object;
  if (!ball) return;
  busy = true;
  controls.stop();
  status.textContent = `${ball.userData.label} connection in progress...`;
  throwBall(ball, hoopGroup.position, () => {
    window.open(ball.userData.label === 'LinkedIn' ? CONFIG.linkedinUrl : getWhatsAppUrl(), '_blank', 'noopener');
    busy = false;
    status.textContent = 'Drag to look around. Choose a ball to connect.';
  });
});

const notebookDialog = document.querySelector('#notebook-dialog');
document.querySelector('#close-notebook').addEventListener('click', () => { notebookDialog.hidden = true; });
document.querySelector('#message-form').addEventListener('submit', (event) => {
  event.preventDefault();
  status.textContent = 'Message form is ready for a Formspree or Web3Forms endpoint.';
  notebookDialog.hidden = true;
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
loading.remove();
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
