import * as THREE from 'three';

export function createCameraControls(camera, element) {
  const state = { dragging: false, previousX: 0, yaw: 0 };
  const limit = Math.PI * 0.36;

  function updateCamera() {
    camera.rotation.y = THREE.MathUtils.clamp(state.yaw, -limit, limit);
  }

  element.addEventListener('pointerdown', (event) => {
    state.dragging = true;
    state.previousX = event.clientX;
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener('pointermove', (event) => {
    if (!state.dragging) return;
    state.yaw -= (event.clientX - state.previousX) * 0.004;
    state.previousX = event.clientX;
    updateCamera();
  });
  element.addEventListener('pointerup', () => { state.dragging = false; });
  element.addEventListener('pointercancel', () => { state.dragging = false; });

  return {
    stop() { state.dragging = false; },
    update: updateCamera
  };
}
