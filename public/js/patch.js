/**
 * Check Flip — v1.17: replace a screen's HTML only when it actually changed.
 * Account updates arriving in the background (friends poll, profile refresh, token refresh)
 * used to rebuild whole screens, replaying animations and closing open boxes. Now an
 * unchanged screen is left alone; a changed one keeps its open boxes, typed text, focus and scroll.
 */
export function setHTML(el, html) {
  if (!el) return false;
  if (el.__h === html && el.innerHTML) return false;
  const open = Array.from(el.querySelectorAll('details'), d => d.open);
  const vals = {}; el.querySelectorAll('input[id],textarea[id],select[id]').forEach(x => { if (x.type !== 'checkbox' && x.type !== 'radio' && x.type !== 'password') vals[x.id] = x.value; });
  const focus = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : '';
  const scr = Array.from(el.querySelectorAll('[data-keepscroll]'), x => x.scrollTop);
  el.innerHTML = html; el.__h = html;
  const ds = el.querySelectorAll('details'); if (ds.length === open.length) ds.forEach((d, k) => { d.open = open[k]; });
  for (const id in vals) { const x = el.querySelector('#' + CSS.escape(id)); if (x && !x.value && vals[id]) x.value = vals[id]; }
  if (focus) { const x = el.querySelector('#' + CSS.escape(focus)); if (x) x.focus({preventScroll: true}); }
  el.querySelectorAll('[data-keepscroll]').forEach((x, k) => { if (scr[k]) x.scrollTop = scr[k]; });
  window.__cfBuilds = (window.__cfBuilds || 0) + 1;   // read by the browser tests
  return true;
}
