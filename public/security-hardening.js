/* Lightweight deterrents only; browser DevTools cannot be reliably blocked client-side. */
(function () {
  'use strict';
  if (window.__bdzInteractionGuardInstalled) return;
  window.__bdzInteractionGuardInstalled = true;
  document.addEventListener('keydown', function (event) {
    const key = String(event.key || '').toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    const blocked = key === 'f12' ||
      (mod && event.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) ||
      (mod && key === 'u') ||
      (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(key));
    if (blocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('contextmenu', function (event) {
    const target = event.target;
    if (target && target.closest && target.closest('input, textarea, select, [contenteditable="true"], #key, #out, .key-code')) return;
    event.preventDefault();
  }, true);
})();
