import { CONFIG } from './config.js';

// Scoreboard overlay (top-right). Not wired to gameplay yet: call incrementScore() once a throw lands.
const nameEl = document.getElementById('scoreboardName');
const valueEl = document.getElementById('scoreboardValue');
let score = 0;

nameEl.textContent = CONFIG.SCOREBOARD_NAME;

export function getScore() { return score; }

export function incrementScore(by = 1) {
  score += by;
  valueEl.textContent = String(score);
  valueEl.classList.remove('is-bumped');
  void valueEl.offsetWidth;
  valueEl.classList.add('is-bumped');
  return score;
}

// Exposed for testing from the browser console until the throw animation calls it.
window.incrementScore = incrementScore;
