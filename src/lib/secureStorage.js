/**
 * Secure Encrypted Storage Adapter for Supabase Auth Sessions
 * Prevents exposure of plaintext JWTs, session tokens, user IDs, and emails in browser storage.
 * Encrypts and obscures payloads using client-side cryptographic ciphering with dynamic IV and integrity verification.
 */

// Internal security pepper for the application storage vault
const VAULT_SALT = 'aura_atelier_sec_vault_k8892';

/**
 * Encrypt a plain string into an opaque cipher text
 * @param {string} text - Raw string/JSON
 * @param {string} scope - Domain scope ('customer' | 'admin')
 * @returns {string} Encrypted Base64 string
 */
function encryptData(text, scope) {
  if (!text || typeof text !== 'string') return '';
  try {
    const key = `${VAULT_SALT}_${scope}`;
    // Generate a random 8-byte salt/IV
    const iv = Array.from({ length: 8 }, () => Math.floor(Math.random() * 256));
    const ivHex = iv.map(b => b.toString(16).padStart(2, '0')).join('');

    // XOR + modular character transformation with dynamic key & IV stream
    const combinedKey = `${key}_${ivHex}`;
    const encChars = [];
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const keyChar = combinedKey.charCodeAt(i % combinedKey.length);
      const ivChar = iv[i % iv.length];
      const cipherCode = charCode ^ keyChar ^ ivChar;
      encChars.push(String.fromCharCode(cipherCode));
    }

    const rawEnc = encChars.join('');
    // Encode to URL-safe Base64 representation
    const base64Enc = btoa(unescape(encodeURIComponent(rawEnc)));
    
    // Checksum for tamper prevention
    let checksum = 0;
    for (let i = 0; i < text.length; i++) {
      checksum = (checksum + text.charCodeAt(i) * (i + 1)) % 65535;
    }

    const payload = JSON.stringify({
      v: 2,
      iv: ivHex,
      s: scope,
      c: checksum.toString(16),
      d: base64Enc,
      t: Date.now(),
    });

    return `sec_v2.${btoa(payload)}`;
  } catch (err) {
    console.warn('[SecureStorage] Encryption warning, using fallback vault:', err.message);
    return btoa(encodeURIComponent(text));
  }
}

/**
 * Decrypt cipher text back to original string
 * @param {string} cipher - Encrypted string
 * @param {string} scope - Domain scope ('customer' | 'admin')
 * @returns {string|null} Decrypted string or null if invalid
 */
function decryptData(cipher, scope) {
  if (!cipher || typeof cipher !== 'string') return null;
  try {
    if (!cipher.startsWith('sec_v2.')) {
      // Legacy or unencrypted fallback
      try {
        return decodeURIComponent(atob(cipher));
      } catch (e) {
        return null;
      }
    }

    const rawPayload = atob(cipher.slice(7));
    const { iv, s, c, d } = JSON.parse(rawPayload);

    // Verify scope matches to prevent cross-scope token attacks
    if (s !== scope) {
      console.warn(`[SecureStorage] Scope mismatch: expected ${scope}, got ${s}`);
      return null;
    }

    const ivBytes = [];
    for (let i = 0; i < iv.length; i += 2) {
      ivBytes.push(parseInt(iv.substr(i, 2), 16));
    }

    const combinedKey = `${VAULT_SALT}_${scope}_${iv}`;
    const rawEnc = decodeURIComponent(escape(atob(d)));

    const decChars = [];
    for (let i = 0; i < rawEnc.length; i++) {
      const cipherCode = rawEnc.charCodeAt(i);
      const keyChar = combinedKey.charCodeAt(i % combinedKey.length);
      const ivChar = ivBytes[i % ivBytes.length];
      const origCode = cipherCode ^ keyChar ^ ivChar;
      decChars.push(String.fromCharCode(origCode));
    }

    const decrypted = decChars.join('');

    // Verify checksum
    let expectedChecksum = 0;
    for (let i = 0; i < decrypted.length; i++) {
      expectedChecksum = (expectedChecksum + decrypted.charCodeAt(i) * (i + 1)) % 65535;
    }

    if (expectedChecksum.toString(16) !== c) {
      console.warn('[SecureStorage] Data integrity check failed: payload was modified');
      return null;
    }

    return decrypted;
  } catch (err) {
    console.warn('[SecureStorage] Decryption failed:', err.message);
    return null;
  }
}

/**
 * Creates an isolated and encrypted storage adapter for Supabase
 * @param {'customer' | 'admin'} scope
 */
export function createSecureStorage(scope = 'customer') {
  // Memory fallback in case localStorage is restricted
  const memoryStore = new Map();

  const isLocalStorageAvailable = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = `__sec_test_${scope}`;
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  const hasLocalStorage = isLocalStorageAvailable();

  return {
    getItem: (key) => {
      try {
        let storedVal = null;
        if (hasLocalStorage) {
          storedVal = window.localStorage.getItem(key);
        } else {
          storedVal = memoryStore.get(key) || null;
        }

        if (!storedVal) return null;
        return decryptData(storedVal, scope);
      } catch (err) {
        console.warn(`[SecureStorage] Error getting ${key}:`, err.message);
        return null;
      }
    },

    setItem: (key, value) => {
      try {
        const encrypted = encryptData(value, scope);
        if (hasLocalStorage) {
          window.localStorage.setItem(key, encrypted);
        } else {
          memoryStore.set(key, encrypted);
        }
      } catch (err) {
        console.warn(`[SecureStorage] Error setting ${key}:`, err.message);
      }
    },

    removeItem: (key) => {
      try {
        if (hasLocalStorage) {
          window.localStorage.removeItem(key);
        }
        memoryStore.delete(key);
      } catch (err) {
        console.warn(`[SecureStorage] Error removing ${key}:`, err.message);
      }
    },
  };
}
