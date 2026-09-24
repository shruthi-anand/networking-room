import { CONFIG } from './config.js';

// Message overlay (plain HTML, outside the 3D scene). Posts to Formspree; `_gotcha` is Formspree's honeypot field.
const sheet = document.getElementById('messageSheet');
const form = document.getElementById('messageForm');
const text = document.getElementById('messageText');
const status = document.getElementById('messageStatus');
const sendBtn = document.getElementById('messageSend');
const copy = CONFIG.MESSAGE_FORM;
let onCloseCb = null, closeTimer = null;

document.getElementById('messageTitle').textContent = copy.title;
text.placeholder = copy.placeholder;
sendBtn.textContent = copy.send;
form.elements._subject.value = copy.subject;
form.elements.event.value = CONFIG.CURRENT_EVENT;

function setStatus(message, tone = '') { status.textContent = message; status.dataset.tone = tone; }

export function openMessageForm({ onClose } = {}) {
  onCloseCb = onClose || null;
  clearTimeout(closeTimer);
  setStatus('');
  sendBtn.disabled = false; sendBtn.textContent = copy.send;
  sheet.hidden = false;
  requestAnimationFrame(() => { sheet.classList.add('is-open'); text.focus({ preventScroll: true }); });
}

export function closeMessageForm() {
  if (sheet.hidden) return;
  clearTimeout(closeTimer);
  sheet.classList.remove('is-open');
  text.blur();
  setTimeout(() => { sheet.hidden = true; }, 260);
  const cb = onCloseCb; onCloseCb = null; cb?.();
}

export function isMessageFormOpen() { return !sheet.hidden; }

document.getElementById('messageClose').addEventListener('click', closeMessageForm);
sheet.addEventListener('pointerdown', (event) => { if (event.target === sheet) closeMessageForm(); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !sheet.hidden) closeMessageForm(); });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = text.value.trim();
  if (!message) { setStatus(copy.empty, 'error'); text.focus(); return; }
  const done = () => {
    setStatus(copy.sent, 'ok'); text.value = ''; sendBtn.textContent = copy.send;
    closeTimer = setTimeout(closeMessageForm, 1600);
  };
  // A bot filled the hidden field: act as if it worked, send nothing.
  if (form.elements._gotcha.value) { done(); return; }
  if (!CONFIG.FORMSPREE_FORM_ID) { setStatus(copy.notSetUp, 'error'); return; }
  sendBtn.disabled = true; sendBtn.textContent = copy.sending; setStatus('');
  try {
    const res = await fetch(`https://formspree.io/f/${CONFIG.FORMSPREE_FORM_ID}`, {
      method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form),
    });
    if (!res.ok) throw new Error(`Formspree ${res.status}`);
    done();
  } catch {
    setStatus(copy.failed, 'error'); sendBtn.textContent = copy.send;
  } finally {
    sendBtn.disabled = false;
  }
});
