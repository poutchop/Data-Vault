// SafeStore wrapper – provides get/set/remove with fallback to in‑memory storage
const SafeStore = (() => {
  let mem = {};
  let ok = false;
  try {
    window.localStorage.setItem('__test', '1');
    window.localStorage.removeItem('__test');
    ok = true;
  } catch (e) {
    ok = false;
  }
  return {
    get: (k) => (ok ? window.localStorage.getItem(k) : mem[k] ?? null),
    set: (k, v) => (ok ? window.localStorage.setItem(k, v) : (mem[k] = v)),
    remove: (k) => (ok ? window.localStorage.removeItem(k) : delete mem[k]),
  };
})();
export default SafeStore;
