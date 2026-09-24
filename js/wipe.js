import * as THREE from 'three';

// Brand-colour circular wipe, drawn in WebGL over the scene rather than as a DOM overlay. iOS Safari tints its status
// and tool bars from the background colour of fixed elements at the screen edges and does not reliably re-check after
// returning from another app, so a green full-screen <div> left green bands behind. Pixels in the canvas are never
// sampled, and the canvas itself stays black.
export function createWipe(renderer) {
  const uniforms = {
    uColor: { value: new THREE.Vector3() },
    uCenter: { value: new THREE.Vector2() },
    uRadius: { value: 0 },
    uOpacity: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // Colour goes out untouched (no tone mapping / colour-space chunks), so the brand hex lands on screen as-is.
    fragmentShader: `uniform vec3 uColor; uniform vec2 uCenter; uniform float uRadius, uOpacity;
      void main() { float d = length(gl_FragCoord.xy - uCenter);
        gl_FragColor = vec4(uColor, uOpacity * (1.0 - smoothstep(uRadius - 1.0, uRadius + 1.0, d))); }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.Camera();
  let fade = null;

  return {
    setColor(hex) {
      const n = parseInt(hex.slice(1), 16);
      uniforms.uColor.value.set(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    },
    // radius / x / y in CSS pixels from the top-left, like the rest of the page; Infinity fills the screen.
    draw(radius, x, y, opacity) {
      const pr = renderer.getPixelRatio();
      uniforms.uRadius.value = radius === Infinity ? 1e7 : radius * pr;
      uniforms.uCenter.value.set(x * pr, renderer.domElement.height - y * pr);
      uniforms.uOpacity.value = opacity;
      fade = null;
    },
    fadeOut(ms) { fade = { from: uniforms.uOpacity.value, start: performance.now(), ms }; },
    clear() { uniforms.uOpacity.value = 0; fade = null; },
    render() {
      if (fade) {
        const k = Math.min(1, (performance.now() - fade.start) / fade.ms);
        uniforms.uOpacity.value = fade.from * (1 - k);
        if (k >= 1) fade = null;
      }
      if (uniforms.uOpacity.value <= 0) return;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = autoClear;
    },
  };
}
