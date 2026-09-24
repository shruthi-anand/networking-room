// Vercel Web Analytics custom events. index.html defines a window.va queue stub and loads /_vercel/insights/script.js,
// which flushes the queue once it arrives. No personal details go into event data.
export function track(name, data) {
  try { window.va?.('event', data ? { name, data } : { name }); } catch { /* analytics must never break the page */ }
}
