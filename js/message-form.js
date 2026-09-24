import { CONFIG } from './config.js';

// Message overlay (plain HTML, outside the 3D scene). Posts to Formspree; `_gotcha` is Formspree's honeypot field.
// Name and an email or LinkedIn link are required; the message itself is optional.
const sheet = document.getElementById('messageSheet');
const form = document.getElementById('messageForm');
const nameInput = document.getElementById('messageName');
const contactInput = document.getElementById('messageContact');
const text = document.getElementById('messageText');
const status = document.getElementById('messageStatus');
const sendBtn = document.getElementById('messageSend');
const copy = CONFIG.MESSAGE_FORM;
let onCloseCb = null, onSentCb = null, closeTimer = null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LINKEDIN = /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\/[^\s/?#]+/i;

document.getElementById('messageTitle').textContent = copy.title;
document.getElementById('messageNameLabel').textContent = copy.nameLabel;
document.getElementById('messageContactLabel').textContent = copy.contactLabel;
document.getElementById('messageTextLabel').textContent = copy.messageLabel;
nameInput.placeholder = copy.namePlaceholder;
contactInput.placeholder = copy.contactPlaceholder;
text.placeholder = copy.messagePlaceholder;
sendBtn.textContent = copy.send;
form.elements._subject.value = copy.subject;
form.elements.event.value = CONFIG.CURRENT_EVENT;

function setStatus(message, tone = '') { status.textContent = message; status.dataset.tone = tone; }
function markInvalid(input, message) { input.setAttribute('aria-invalid', 'true'); setStatus(message, 'error'); input.focus(); }
const clearInvalid = () => [nameInput, contactInput].forEach((input) => input.removeAttribute('aria-invalid'));
[nameInput, contactInput].forEach((input) => input.addEventListener('input', () => input.removeAttribute('aria-invalid')));

// Returns the contact as sent (LinkedIn links get https://) and its type, or null if it is neither.
function readContact(value) {
  if (EMAIL.test(value)) return { value, type: 'email' };
  if (LINKEDIN.test(value)) return { value: /^https?:\/\//i.test(value) ? value : `https://${value}`, type: 'linkedin' };
  return null;
}

export function openMessageForm({ onClose, onSent } = {}) {
  onCloseCb = onClose || null; onSentCb = onSent || null;
  clearInvalid();
  clearTimeout(closeTimer);
  setStatus('');
  sendBtn.disabled = false; sendBtn.textContent = copy.send;
  sheet.hidden = false;
  requestAnimationFrame(() => { sheet.classList.add('is-open'); nameInput.focus({ preventScroll: true }); });
}

export function closeMessageForm() {
  if (sheet.hidden) return;
  clearTimeout(closeTimer);
  sheet.classList.remove('is-open');
  document.activeElement?.blur();
  setTimeout(() => { sheet.hidden = true; }, 260);
  const cb = onCloseCb; onCloseCb = null; cb?.();
}

export function isMessageFormOpen() { return !sheet.hidden; }

document.getElementById('messageClose').addEventListener('click', closeMessageForm);
sheet.addEventListener('pointerdown', (event) => { if (event.target === sheet) closeMessageForm(); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !sheet.hidden) closeMessageForm(); });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearInvalid();
  const name = nameInput.value.trim();
  const rawContact = contactInput.value.trim();
  if (!name) { markInvalid(nameInput, copy.needName); return; }
  if (!rawContact) { markInvalid(contactInput, copy.needContact); return; }
  const contact = readContact(rawContact);
  if (!contact) { markInvalid(contactInput, copy.badContact); return; }

  const done = () => {
    setStatus(copy.sent, 'ok'); form.reset(); sendBtn.textContent = copy.send;
    form.elements._subject.value = copy.subject; form.elements.event.value = CONFIG.CURRENT_EVENT;
    closeTimer = setTimeout(closeMessageForm, 1600);
  };
  // A bot filled the hidden field: act as if it worked, send nothing.
  if (form.elements._gotcha.value) { done(); return; }
  if (!CONFIG.FORMSPREE_FORM_ID) { setStatus(copy.notSetUp, 'error'); return; }

  const data = new FormData(form);
  data.set('name', name);
  data.set('contact', contact.value);
  data.set('contact_type', contact.type);
  data.set('_replyto', contact.type === 'email' ? contact.value : ''); // lets you reply straight from the inbox
  sendBtn.disabled = true; sendBtn.textContent = copy.sending; setStatus('');
  try {
    const res = await fetch(`https://formspree.io/f/${CONFIG.FORMSPREE_FORM_ID}`, {
      method: 'POST', headers: { Accept: 'application/json' }, body: data,
    });
    if (!res.ok) throw new Error(`Formspree ${res.status}`);
    onSentCb?.({ contactType: contact.type, hasMessage: !!text.value.trim() });
    done();
  } catch {
    setStatus(copy.failed, 'error'); sendBtn.textContent = copy.send;
  } finally {
    sendBtn.disabled = false;
  }
});
