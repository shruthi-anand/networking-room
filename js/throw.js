import * as THREE from 'three';

// Keyframed throw sequence (no physics): staged phases on one clock, same easing style as load-in.js.
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIn = (x) => x * x * x;
const prog = (t, [start, dur]) => Math.min(1, Math.max(0, (t - start) / dur));

// [start, duration] in seconds from release.
const PHASE = {
  windup: [0, 0.18],   // dip + squash before launch
  flight: [0.14, 1.12], // lob from the ball's spot, landing near-vertically above the rim
  drop: [1.26, 0.62],   // through the rim and net, straight down the under-camera's line of sight
  chase: [0.08, 1.0],   // camera eases in behind and above the ball
  under: [0.98, 0.62],  // camera swings below the net and looks up at the rim
  wipe: [1.62, 0.42],   // brand-colour circle takes over the ball's silhouette, then the screen
};
const ROUTE_AT = 2.14, HOLD = 0.9;
// Reduced motion: no camera flight, just a short colour fade.
const REDUCED = { fade: [0, 0.3], score: 0.3, route: 0.45 };

const CHASE_OFFSET = new THREE.Vector3(0, 0.22, 0.75);
const UNDER_OFFSET = new THREE.Vector3(0, -1.35, 0.3); // camera spot relative to the rim centre
const LAUNCH_RISE = 1.6; // how far above the ball the launch control point sits (sets the arc height)
const FLIGHT_SCALE = 0.82; // ball shrinks a touch in flight so it clears the rim comfortably

export function createThrow({ camera, hoop, wipe }) {
  let run = null;
  const tmp = new THREE.Vector3(), q = new THREE.Vector3();

  // Cubic lob: launches mostly upward, peaks, then comes down steeply along the drop line into the rim.
  function bezier(a, c1, c2, b, u, out) {
    const k = 1 - u;
    return out.set(0, 0, 0).addScaledVector(a, k * k * k).addScaledVector(c1, 3 * k * k * u).addScaledVector(c2, 3 * k * u * u).addScaledVector(b, u * u * u);
  }

  function drawWipe(radius, x, y, opacity) {
    if (!run.wiping) { run.wiping = true; run.onWipe?.(); }
    wipe.draw(radius, x, y, opacity);
  }

  // Screen-space radius of a sphere: from its angular radius, so it stays right when the ball is very close.
  function projectBall(ball) {
    const d = camera.position.distanceTo(ball.position), r = ball.scale.x;
    const ang = d > r ? Math.asin(r / d) : Math.PI / 2;
    tmp.copy(ball.position).project(camera);
    const focal = innerHeight / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    return { x: (tmp.x + 1) * 0.5 * innerWidth, y: (-tmp.y + 1) * 0.5 * innerHeight, r: Math.tan(Math.min(ang, 1.5)) * focal };
  }

  function start(ball, { radius, color, reduced = false, onScore, onWipe, onRoute, onFinish }) {
    const R = hoop.rim.center.clone();
    const under = R.clone().add(UNDER_OFFSET);
    const sight = R.clone().sub(under).normalize(); // from the under-camera up through the rim
    const above = R.clone().addScaledVector(sight, 0.38);
    const stop = under.clone().addScaledVector(sight, 0.22);
    const cam0 = camera.position.clone();
    run = {
      ball, radius, reduced, onScore, onWipe, onRoute, onFinish, wiping: false,
      t0: performance.now(), last: 0, scored: false, routed: false, finished: false,
      S: ball.position.clone(), scale0: ball.scale.x,
      c1: ball.position.clone().lerp(above, 0.25).setY(ball.position.y + LAUNCH_RISE),
      c2: above.clone().addScaledVector(sight, 1.0), above, stop, R, under,
      scoreAt: above.distanceTo(R) / above.distanceTo(stop),
      cam0, look0: cam0.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3)),
    };
    wipe.setColor(color);
    wipe.clear();
  }

  function score() { if (run.scored) return; run.scored = true; hoop.swish(); run.onScore?.(); }
  function route() { if (run.routed) return; run.routed = true; run.onRoute?.(); }

  function finish() {
    if (!run || run.finished) return;
    run.finished = true;
    camera.position.copy(run.cam0);
    wipe.fadeOut(450);
    const done = run.onFinish;
    run = null;
    done?.();
  }

  function update(now) {
    if (!run) return;
    const t = (now - run.t0) / 1000, dt = Math.max(0, t - run.last);
    run.last = t;
    const { ball } = run;

    if (run.reduced) {
      drawWipe(Infinity, 0, 0, easeOut(prog(t, REDUCED.fade)));
      if (t >= REDUCED.score) score();
      if (t >= REDUCED.route) route();
      if (t >= REDUCED.route + HOLD) finish();
      return;
    }

    // Ball: wind-up, lob, then drop through the net toward the under-camera.
    const w = prog(t, PHASE.windup), u = prog(t, PHASE.flight), d = prog(t, PHASE.drop);
    if (t < PHASE.flight[0]) {
      const k = Math.sin(w * Math.PI);
      ball.position.copy(run.S).y -= k * run.radius * 0.25;
      ball.scale.set(run.scale0 * (1 + k * 0.08), run.scale0 * (1 - k * 0.12), run.scale0 * (1 + k * 0.08));
    } else if (d <= 0) {
      bezier(run.S, run.c1, run.c2, run.above, u, ball.position);
      ball.scale.setScalar(THREE.MathUtils.lerp(run.scale0, run.radius * FLIGHT_SCALE, easeInOut(u)));
    } else {
      const s = 0.5 * d + 0.5 * d * d; // keeps the lob's downward speed, then accelerates
      ball.position.copy(run.above).lerp(run.stop, s);
      ball.scale.setScalar(run.radius * FLIGHT_SCALE);
      if (s >= run.scoreAt) score();
    }
    ball.rotation.x -= dt * 9; // backspin

    // Camera: chase behind the ball, then drop below the net and look up the ball's path.
    const c = easeInOut(prog(t, PHASE.chase)), b = easeInOut(prog(t, PHASE.under));
    tmp.copy(ball.position).add(CHASE_OFFSET);
    camera.position.copy(run.cam0).lerp(tmp, c).lerp(run.under, b);
    q.copy(run.look0).lerp(ball.position, c).lerp(run.R, b);
    camera.lookAt(q);

    // Wipe: a circle locked to the ball's silhouette fades to flat brand colour, then grows to fill the screen.
    if (t >= PHASE.wipe[0]) {
      const p = projectBall(ball), diag = Math.hypot(innerWidth, innerHeight);
      const g = prog(t, PHASE.wipe);
      if (g >= 1) drawWipe(Infinity, 0, 0, 1);
      else drawWipe(Math.max(p.r, easeIn(g) * diag), p.x, p.y, easeOut(prog(t, [PHASE.wipe[0], 0.12])));
    }
    if (t >= ROUTE_AT) route();
    if (t >= ROUTE_AT + HOLD) finish();
  }

  return { start, update, finish, get active() { return !!run; } };
}
