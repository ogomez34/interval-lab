// Tiny pub/sub for cross-module hooks (theme changes, accidental-preference
// changes, tab switches). Replaces the old `window.__rerender*` globals so
// modules can re-render themselves without reaching into each other.
const listeners = {};

export function on(event, fn) {
  (listeners[event] ||= []).push(fn);
  return () => off(event, fn);
}

export function off(event, fn) {
  const list = listeners[event];
  if (!list) return;
  const i = list.indexOf(fn);
  if (i >= 0) list.splice(i, 1);
}

export function emit(event, ...args) {
  (listeners[event] || []).slice().forEach(fn => fn(...args));
}
