const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrap180 = (a) => ((a + 540) % 360) - 180;
// Tilt response: gentle near centre, quicker toward the edge (f(0)=0, f(1)=1, slope 0.2 at centre, 2.6 at the edge).
const tiltCurve = (u) => Math.sign(u) * (0.2 * Math.abs(u) + 0.8 * Math.abs(u) ** 3);

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
    // tiltRange / tiltRangePitch: how far the phone turns (degrees) to reach the view limit.
    this.opts = { yawLimit: 38, pitchLimit: 10, dragSpeed: 0.16, tiltRange: 38, tiltRangePitch: 25, damping: 7, ...opts };
    camera.rotation.order = 'YXZ'; this.baseYaw = camera.rotation.y; this.basePitch = camera.rotation.x;
    this.drag = { yaw: 0, pitch: 0 }; this.tilt = { yaw: 0, pitch: 0 }; this.phys = { yaw: 0, pitch: 0 }; this.yaw = 0; this.pitch = 0;
    this.dragging = false; this.motionActive = false; this.frozen = false; this._pointerId = null; this._last = null; this._onFirstOrient = null;
    this._down = this._down.bind(this); this._move = this._move.bind(this); this._up = this._up.bind(this); this._orient = this._orient.bind(this); this._reorient = () => { this._last = null; this.recenter(); };
    domElement.addEventListener('pointerdown', this._down); window.addEventListener('pointermove', this._move); window.addEventListener('pointerup', this._up); window.addEventListener('pointercancel', this._up);
  }
  get inputMode() { return this.motionActive ? 'tilt' : 'drag'; }
  enableMotion() {
    const permission = requestMotionPermission();
    return permission.then((res) => {
      if (res !== 'granted') return res;
      if (this.motionActive) { this.recenter(); return 'granted'; }
      this._last = null; window.addEventListener('deviceorientation', this._orient); window.addEventListener('orientationchange', this._reorient);
      return new Promise((resolve) => { const timer = setTimeout(() => { this.disableMotion(); resolve('unsupported'); }, 1200); this._onFirstOrient = () => { clearTimeout(timer); this.motionActive = true; resolve('granted'); }; });
    });
  }
  disableMotion() { window.removeEventListener('deviceorientation', this._orient); window.removeEventListener('orientationchange', this._reorient); this.motionActive = false; this.tilt.yaw = this.tilt.pitch = 0; }
  recenter() { this.phys.yaw = this.phys.pitch = 0; this.tilt.yaw = this.tilt.pitch = 0; this.drag.yaw = this.drag.pitch = 0; }
  // While suspended (e.g. a ball press or the throw sequence) pointer drags do not move the camera and update() is not called.
  suspend() { this.suspended = true; if (this.dragging) { this.dragging = false; this._pointerId = null; this.dom.classList.remove('is-dragging'); } }
  resume() { this.suspended = false; }
  // Frozen: no tilt or drag input is applied, so unfreezing carries on from the same view instead of jumping to wherever
  // the phone now points. With recenter, the view first glides back to centre and then holds there.
  freeze({ recenter = false } = {}) { this.frozen = true; this.suspend(); if (recenter) { this._recentering = true; this.recenter(); } }
  unfreeze() { this.frozen = false; this._recentering = false; this.suspended = false; }
  update(dt) {
    if (this.frozen && !this._recentering) return;
    const { yawLimit: Y, pitchLimit: P, damping } = this.opts; let ty = this.drag.yaw + this.tilt.yaw, tp = this.drag.pitch + this.tilt.pitch;
    if (this.frozen) ty = tp = 0;
    else if (!this.dragging) { ty = clamp(ty, -Y, Y); tp = clamp(tp, -P, P); }
    const k = 1 - Math.exp(-damping * Math.min(dt, 0.1)); this.yaw += (ty - this.yaw) * k; this.pitch += (tp - this.pitch) * k;
    this.camera.rotation.set(this.basePitch + this.pitch * DEG, this.baseYaw + this.yaw * DEG, 0);
  }
  dispose() { this.disableMotion(); this.dom.removeEventListener('pointerdown', this._down); window.removeEventListener('pointermove', this._move); window.removeEventListener('pointerup', this._up); window.removeEventListener('pointercancel', this._up); }
  _down(e) { if (this.suspended || this.frozen) return; if (e.pointerType === 'mouse' && e.button !== 0) return; if (this._pointerId !== null) return; this._pointerId = e.pointerId; this.dragging = true; this._lx = e.clientX; this._ly = e.clientY; this.dom.classList.add('is-dragging'); }
  _move(e) { if (!this.dragging || e.pointerId !== this._pointerId) return; const dx = e.clientX - this._lx, dy = e.clientY - this._ly; this._lx = e.clientX; this._ly = e.clientY; const { dragSpeed, yawLimit: Y, pitchLimit: P } = this.opts; this.drag.yaw = clamp(this.drag.yaw + dx * dragSpeed, -Y - this.tilt.yaw, Y - this.tilt.yaw); this.drag.pitch = clamp(this.drag.pitch + dy * dragSpeed, -P - this.tilt.pitch, P - this.tilt.pitch); }
  _up(e) { if (e.pointerId !== this._pointerId) return; this._pointerId = null; this.dragging = false; this.dom.classList.remove('is-dragging'); const { yawLimit: Y, pitchLimit: P } = this.opts; this.drag.yaw = clamp(this.drag.yaw + this.tilt.yaw, -Y, Y) - this.tilt.yaw; this.drag.pitch = clamp(this.drag.pitch + this.tilt.pitch, -P, P) - this.tilt.pitch; }
  _orient(e) {
    if (e.beta == null || e.gamma == null) return;
    if (this._onFirstOrient) { this._onFirstOrient(); this._onFirstOrient = null; }
    const angle = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0; let side, fwd;
    switch ((angle + 360) % 360) { case 90: side = e.beta; fwd = -e.gamma; break; case 270: side = -e.beta; fwd = e.gamma; break; case 180: side = -e.gamma; fwd = -e.beta; break; default: side = e.gamma; fwd = e.beta; }
    // Track tilt as small per-event changes. The sensor flips by ~180° when the phone passes ±90° (gamma wraps),
    // so any single jump over 45° is that flip, not real movement, and is ignored instead of throwing the view across.
    const last = this._last; this._last = { side, fwd };
    if (!last || this.frozen) return;
    const step = (now, prev) => { const d = wrap180(now - prev); return Math.abs(d) > 45 ? 0 : d; };
    const { tiltRange: T, tiltRangePitch: TP, yawLimit: Y, pitchLimit: P } = this.opts;
    // Hard stop at the limits: tilting further holds the view at the edge, tilting back moves it straight away.
    this.phys.yaw = clamp(this.phys.yaw + step(side, last.side), -T, T);
    this.phys.pitch = clamp(this.phys.pitch + step(fwd, last.fwd), -TP, TP);
    this.tilt.yaw = tiltCurve(this.phys.yaw / T) * Y;
    this.tilt.pitch = tiltCurve(this.phys.pitch / TP) * P;
  }
}

export function createLookHint(button, { mode, title, sub = '', autoCollapseMs = 4200, onTap } = {}) {
  const titleEl = button.querySelector('.look-hint__title'); const subEl = button.querySelector('.look-hint__sub'); let timer = null;
  function set({ mode: m, title: t, sub: s }) { if (m) button.dataset.mode = m; if (t != null) titleEl.textContent = t; if (s != null) subEl.textContent = s; button.setAttribute('aria-label', `${titleEl.textContent}. ${subEl.textContent}`.trim()); }
  function redraw() { button.classList.remove('is-drawing'); void button.getBoundingClientRect(); button.classList.add('is-drawing'); }
  function open(ms = autoCollapseMs) { button.classList.add('is-open'); clearTimeout(timer); if (Number.isFinite(ms)) timer = setTimeout(collapse, ms); }
  function collapse() { button.classList.remove('is-open'); }
  button.addEventListener('click', () => { redraw(); open(); onTap && onTap(); }); set({ mode, title, sub }); open();
  return { set, open, collapse, redraw };
}
