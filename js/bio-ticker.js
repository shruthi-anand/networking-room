import { CONFIG } from './config.js';

// Bio panel that extends left out of the scoreboard and types the intro paragraph once.
// The untyped remainder is rendered transparent so the panel's size never shifts while typing.
const el = document.getElementById('bioTicker');
const typedEl = document.getElementById('bioTickerTyped');
const restEl = document.getElementById('bioTickerRest');
const text = CONFIG.BIO.main;
const CHAR_MS = 28, COMMA_MS = 140, STOP_MS = 320, EXTEND_MS = 620;

document.getElementById('bioTickerFull').textContent = text;
restEl.textContent = text;
let started = false;

function finish() { typedEl.textContent = text; restEl.textContent = ''; el.classList.add('is-done'); }

export function startBioTicker() {
  if (started) return;
  started = true;
  el.hidden = false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
  let i = 0;
  const step = () => {
    i += 1;
    typedEl.textContent = text.slice(0, i);
    restEl.textContent = text.slice(i);
    if (i >= text.length) { finish(); return; }
    const ch = text[i - 1];
    setTimeout(step, ch === '.' ? STOP_MS : ch === ',' ? COMMA_MS : CHAR_MS);
  };
  setTimeout(step, EXTEND_MS);
}

// Fades the panel out while a ball is selected; typing carries on underneath so it still only types once.
export function setBioTickerHidden(hidden) { el.classList.toggle('is-hidden', hidden); }
