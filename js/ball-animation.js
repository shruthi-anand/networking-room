import * as THREE from 'three';

export function throwBall(ball, hoopPosition, onComplete) {
  const start = ball.position.clone();
  const end = hoopPosition.clone();
  const duration = 1100;
  const startedAt = performance.now();

  function frame(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    ball.position.lerpVectors(start, end, eased);
    ball.position.y += Math.sin(progress * Math.PI) * 2.2;
    ball.rotation.x += 0.12;
    if (progress < 1) requestAnimationFrame(frame);
    else onComplete?.();
  }

  requestAnimationFrame(frame);
}
