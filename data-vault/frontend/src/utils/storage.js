/**
 * Robust storage utility for Carbon Clarity Data Vault.
 * Handles localStorage/sessionStorage with an in-memory fallback
 * for browsers with strict tracking prevention (e.g., MS Edge).
 */

class MemoryStorage {
  constructor() {
    this.data = {};
  }
  setItem(key, value) {
    this.data[key] = String(value);
  }
  getItem(key) {
    return this.data[key] || null;
  }
  removeItem(key) {
    delete this.data[key];
  }
  clear() {
    this.data = {};
  }
}

const getStorage = (type) => {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return storage;
  } catch (e) {
    console.warn(`[Vault] ${type} is blocked or unavailable. Falling back to in-memory storage.`);
    return new MemoryStorage();
  }
};

export const local = getStorage('localStorage');
export const session = getStorage('sessionStorage');

export default { local, session };
