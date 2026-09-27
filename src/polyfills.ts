import 'core-js/actual/iterator';
import 'core-js/actual/promise/with-resolvers';
import 'core-js/actual/object/has-own';
import 'core-js/actual/array/at';
import 'core-js/actual/array/find-last';
import 'core-js/actual/array/find-last-index';

// Polyfill global Iterator and Iterator.prototype for iOS Safari compatibility
if (typeof (globalThis as any).Iterator === 'undefined') {
  function IteratorPolyfill() {}
  try {
    const proto = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
    IteratorPolyfill.prototype = proto || {};
  } catch {
    IteratorPolyfill.prototype = {};
  }
  (globalThis as any).Iterator = IteratorPolyfill;
  if (typeof window !== 'undefined') {
    (window as any).Iterator = IteratorPolyfill;
  }
}

if (
  (globalThis as any).Iterator?.prototype &&
  typeof (globalThis as any).Iterator.prototype.join !== 'function'
) {
  (globalThis as any).Iterator.prototype.join = function (separator?: string) {
    return Array.from(this as any).join(separator);
  };
}
