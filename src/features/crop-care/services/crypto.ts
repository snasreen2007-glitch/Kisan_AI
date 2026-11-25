/**
 * Encrypted Device Internal Storage Engine
 * Uses Web Crypto API (AES-GCM 256-bit with PBKDF2 100,000 iterations)
 * Zero external dependencies, runs offline in modern browsers and WebViews.
 */

const DEVICE_KEY_STORAGE = "oaca.device_crypto_key";

/** Generate or retrieve persistent device-unique encryption key seed */
function getDeviceKeySeed(): string {
  try {
    let key = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (!key) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      key = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(DEVICE_KEY_STORAGE, key);
    }
    return key;
  } catch {
    return "cropcare-fallback-local-key-secure-2026";
  }
}

/** Derive CryptoKey from a passphrase using PBKDF2 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Convert Uint8Array to Base64 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Convert Base64 to Uint8Array */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedPayload {
  version: number;
  algorithm: "AES-GCM-256";
  iv: string; // Base64
  salt: string; // Base64
  ciphertext: string; // Base64
  timestamp: string;
}

/**
 * Encrypt arbitrary JSON data with AES-GCM 256-bit
 */
export async function encryptData<T>(
  data: T,
  customPassphrase?: string
): Promise<EncryptedPayload> {
  const passphrase = customPassphrase || getDeviceKeySeed();
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for AES-GCM
  const key = await deriveKey(passphrase, salt);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
    },
    key,
    plaintext
  );

  return {
    version: 1,
    algorithm: "AES-GCM-256",
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt),
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Decrypt an AES-GCM 256-bit payload
 */
export async function decryptData<T>(
  payload: EncryptedPayload,
  customPassphrase?: string
): Promise<T> {
  if (payload.algorithm !== "AES-GCM-256") {
    throw new Error(`Unsupported encryption algorithm: ${payload.algorithm}`);
  }

  const passphrase = customPassphrase || getDeviceKeySeed();
  const salt = base64ToUint8Array(payload.salt);
  const iv = base64ToUint8Array(payload.iv);
  const ciphertext = base64ToUint8Array(payload.ciphertext);

  const key = await deriveKey(passphrase, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as T;
}

/**
 * Full encrypted backup structure for export/import
 */
export interface CropCareEncryptedBackup {
  format: "cropcare-encrypted-archive";
  version: number;
  exportedAt: string;
  metadata: {
    scansCount: number;
    remindersCount: number;
    savedCount: number;
    deviceOS: string;
  };
  payload: EncryptedPayload;
  checksum: string; // SHA-256 integrity hash
}

/** Calculate SHA-256 string checksum */
async function computeHash(text: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(text));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate full encrypted export package from local state
 */
export async function createEncryptedBackup(
  state: {
    scans: unknown[];
    reminders: unknown[];
    saved: unknown[];
    settings: unknown[];
    profile: unknown;
    chat: unknown[];
  },
  passphrase?: string
): Promise<CropCareEncryptedBackup> {
  const encryptedPayload = await encryptData(state, passphrase);
  const jsonStr = JSON.stringify(encryptedPayload);
  const checksum = await computeHash(jsonStr);

  return {
    format: "cropcare-encrypted-archive",
    version: 1,
    exportedAt: new Date().toISOString(),
    metadata: {
      scansCount: state.scans.length,
      remindersCount: state.reminders.length,
      savedCount: state.saved.length,
      deviceOS: typeof navigator !== "undefined" ? navigator.userAgent : "local-device",
    },
    payload: encryptedPayload,
    checksum,
  };
}

/**
 * Restore state from encrypted backup package
 */
export async function restoreEncryptedBackup(
  backup: CropCareEncryptedBackup,
  passphrase?: string
): Promise<{
  scans: unknown[];
  reminders: unknown[];
  saved: unknown[];
  settings: unknown[];
  profile: unknown;
  chat: unknown[];
}> {
  if (backup.format !== "cropcare-encrypted-archive") {
    throw new Error("Invalid backup format: Not a verified CropCare encrypted archive");
  }

  const jsonStr = JSON.stringify(backup.payload);
  const expectedHash = await computeHash(jsonStr);
  if (expectedHash !== backup.checksum) {
    throw new Error("Checksum mismatch: Archive may be corrupted or tampered with");
  }

  return decryptData(backup.payload, passphrase);
}
