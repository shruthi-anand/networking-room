const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrap180 = (a) => ((a + 540) % 360) - 180;

function requestMotionPermission() {
  if (typeof window.DeviceOrientationEvent === 'undefined') return Promise.resolve('unsupported');
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    return DeviceOrientationEvent.requestPermission().then((r) => (r === 'granted' ? 'granted' : 'denied')).catch(() => 'denied');
  }
  return Promise.resolve('granted');
}

export class LookAroundControls {
  constructor(camera, domElement, opts = {}) {
    this.camera = camera; this.dom = domElement;
    this.opts = { yawLimit: 38, pitchLimit: 10, dragSpeed: 0.16, tiltGain: 1.15, damping: 7, overscroll: 0.3, ...opts };
    camera.rotation.order = 'YXZ'; this.baseYaw = camera.rotation.y; this.basePitch = camera.rotation.x;
    this.drag = { yaw: 0, pitch: 0 }; this.tilt = { yaw: 0, pitch: 0 }; this.yaw = 0; this.pitch = 0;
    this.dragging = false; this.motionActive = false; this._pointerId = null; this._baseline = null; this._onFirstOrient = null;
    this._down = this._down.bind(this); this._move = this._move.bind(this); this._up = this._up.bind(this); this._orient = this._orient.bind(this); this._reorient = () => this.recenter();
    domElement.addEventListener('pointerdown', this._down); window.addEventListener('pointermove', this._move); window.addEventListener('pointerup', this._up); window.addEventListener('pointercancel', this._up);
  }
  get inputMode() { return this.motionActive ? 'tilt' : 'drag'; }
  enableMotion() {
    const permission = requestMotionPermission();
    return permission.then((res) => {
      if (res !== 'granted') return res;
      if (this.motionActive) { this.recenter(); return 'granted'; }
      this._baseline = null; window.addEventListener('deviceorientation', this._orient); window.addEventListener('orientationchange', this._reorient);
      return new Promise((resolve) => { const timer = setTimeout(() => { this.disableMotion(); resolve('unsupported'); }, 1200); this._onFirstOrient = () => { clearTimeout(timer); this.motionActive = true; resolve('granted'); }; });
    });
  }
  disableMotion() { window.removeEventListener('deviceorientation', this._orient); window.removeEventListener('orientationchange', this._reorient); this.motionActive = false; this.tilt.yaw = this.tilt.pitch = 0; }
  recenter() { this._baseline = null; this.drag.yaw = this.drag.pitch = 0; }
  update(dt) {
    const { yawLimit: Y, pitchLimit: P, damping } = this.opts; let ty = this.drag.yaw + this.tilt.yaw, tp = this.drag.pitch + this.tilt.pitch;
    if (!this.dragging) { ty = clamp(ty, -Y, Y); tp = clamp(tp, -P, P); }
    const k = 1 - Math.exp(-damping * Math.min(dt, 0.1)); this.yaw += (ty - this.yaw) * k; this.pitch += (tp - this.pitch) * k;
    this.camera.rotation.set(this.basePitch + this.pitch * DEG, this.baseYaw + this.yaw * DEG, 0);
  }
  dispose() { this.disableMotion(); this.dom.removeEventListener('pointerdown', this._down); window.removeEventListener('pointermove', this._move); window.removeEventListener('pointerup', this._up); window.removeEventListener('pointercancel', this._up); }
  _down(e) { if (e.pointerType === 'mouse' && e.button !== 0) return; if (this._pointerId !== null) return; this._pointerId = e.pointerId; this.dragging = true; this._lx = e.clientX; this._ly = e.clientY; this.dom.classList.add('is-dragging'); }
  _move(e) { if (!this.dragging || e.pointerId !== this._pointerId) return; const dx = e.clientX - this._lx, dy = e.clientY - this._ly; this._lx = e.clientX; this._ly = e.clientY; const { dragSpeed, overscroll, yawLimit: Y, pitchLimit: P } = this.opts; this.drag.yaw += this._resist(dx * dragSpeed, this.drag.yaw + this.tilt.yaw, Y, overscroll); this.drag.pitch += this._resist(dy * dragSpeed, this.drag.pitch + this.tilt.pitch, P, overscroll); }
  _up(e) { if (e.pointerId !== this._pointerId) return; this._pointerId = null; this.dragging = false; this.dom.classList.remove('is-dragging'); const { yawLimit: Y, pitchLimit: P } = this.opts; this.drag.yaw = clamp(this.drag.yaw + this.tilt.yaw, -Y, Y) - this.tilt.yaw; this.drag.pitch = clamp(this.drag.pitch + this.tilt.pitch, -P, P) - this.tilt.pitch; }
  _resist(delta, total, limit, factor) { return Math.abs(total) > limit && Math.sign(delta) === Math.sign(total) ? delta * factor : delta; }
  _orient(e) {
    if (e.beta == null || e.gamma == null) return;
    if (this._onFirstOrient) { this._onFirstOrient(); this._onFirstOrient = null; }
    const angle = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0; let side, fwd;
    switch ((angle + 360) % 360) { case 90: side = e.beta; fwd = -e.gamma; break; case 270: side = -e.beta; fwd = e.gamma; break; case 180: side = -e.gamma; fwd = -e.beta; break; default: side = e.gamma; fwd = e.beta; }
    if (!this._baseline) this._baseline = { side, fwd }; const { tiltGain } = this.opts; this.tilt.yaw = wrap180(side - this._baseline.side) * tiltGain; this.tilt.pitch = wrap180(fwd - this._baseline.fwd) * tiltGain * 0.6;
  }
}

export function createLookHint(button, { mode, title, sub = '', autoCollapseMs = 4200, onTap } = {}) {
  const titleEl = button.querySelector('.look-hint__title'); const subEl = button.querySelector('.look-hint__sub'); let timer = null;
  function set({ mode: m, title: t, sub: s }) { if (m) button.dataset.mode = m; if (t != null) titleEl.textContent = t; if (s != null) subEl.textContent = s; button.setAttribute('aria-label', `${titleEl.textContent}. ${subEl.textContent}`.trim()); }
  function redraw() { button.classList.remove('is-drawing'); void button.getBoundingClientRect(); button.classList.add('is-drawing'); }
  function open(ms = autoCollapseMs) { button.classList.add('is-open'); clearTimeout(timer); timer = setTimeout(collapse, ms); }
  function collapse() { button.classList.remove('is-open'); }
  button.addEventListener('click', () => { redraw(); open(); onTap && onTap(); }); set({ mode, title, sub }); open();
  return { set, open, collapse, redraw };
}
