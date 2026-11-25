import {
  createEncryptedBackup,
  restoreEncryptedBackup,
  type CropCareEncryptedBackup,
} from "./crypto";
import type { LocalEvent, Reminder, SavedItem, Scan, Settings } from "./types";

/**
 * Web-preview persistence on localStorage. The Android app connects Room/SQLite.
 * Provides transparent AES-GCM 256-bit encrypted export and import capabilities.
 */
const KEYS = {
  scans: "oaca.scans.v1",
  saved: "oaca.saved.v1",
  settings: "oaca.settings.v1",
  reminders: "oaca.reminders.v1",
  events: "oaca.events.v1",
  recent: "oaca.recent.v1",
  chat: "oaca.chat.v1",
} as const;
export type StoreKey = keyof typeof KEYS;

export const defaultSettings: Settings = {
  onboarded: false,
  name: "",
  lang: "en",
  theme: "light",
  state: "Andhra Pradesh",
  district: "Guntur",
  season: "kharif",
  crops: ["rice", "chilli"],
  llmProvider: "auto",
  geminiApiKey: "",
  groqApiKey: "",
  openaiApiKey: "",
  customModel: "",
};

function read<T>(key: StoreKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEYS[key]);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: StoreKey, value: unknown): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(KEYS[key], JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`localStorage write failed for key ${key}, attempting quota cleanup:`, err);
    try {
      // If scans exceeded quota, evict oldest scans and keep only top 15
      if (key === "scans" && Array.isArray(value)) {
        const reduced = (value as Scan[]).slice(0, 15);
        window.localStorage.setItem(KEYS[key], JSON.stringify(reduced));
        return true;
      }
      // Or try clearing non-critical event and recent logs
      window.localStorage.removeItem(KEYS.events);
      window.localStorage.removeItem(KEYS.recent);
      window.localStorage.setItem(KEYS[key], JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}

export const historyService = {
  list: (): Scan[] => {
    const stored = read<Scan[]>("scans", []);
    if (typeof window !== "undefined") {
      try {
        const last = window.sessionStorage.getItem("kisanai.last_scan");
        if (last) {
          const parsed = JSON.parse(last) as Scan;
          if (parsed?.id && !stored.some((s) => s.id === parsed.id)) {
            return [parsed, ...stored];
          }
        }
      } catch {}
    }
    return stored;
  },
  save: (scans: Scan[]) => {
    // Keep top 30 scans to protect against quota limits
    return write("scans", scans.slice(0, 30));
  },
  clear: () => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("kisanai.last_scan");
      } catch {}
    }
    return write("scans", []);
  },
};

export const savedService = {
  list: () => read<SavedItem[]>("saved", []),
  save: (items: SavedItem[]) => write("saved", items),
  clear: () => write("saved", []),
};

export const settingsService = {
  load: (): Settings => {
    const isCompleted = typeof window !== "undefined" && window.localStorage.getItem("kisanai_welcome_completed") === "true";
    const stored = read<Partial<Settings>>("settings", {});
    return {
      ...defaultSettings,
      ...stored,
      onboarded: isCompleted || Boolean(stored.onboarded),
    };
  },
  save: (settings: Settings) => {
    if (settings.onboarded && typeof window !== "undefined") {
      window.localStorage.setItem("kisanai_welcome_completed", "true");
    }
    return write("settings", settings);
  },
};

export const reminderService = {
  list: () => read<Reminder[]>("reminders", []),
  save: (items: Reminder[]) => write("reminders", items),
};

export const eventService = {
  list: () => read<LocalEvent[]>("events", []),
  save: (items: LocalEvent[]) => write("events", items.slice(0, 50)),
};

export const recentService = {
  list: () => read<string[]>("recent", []),
  save: (items: string[]) => write("recent", items.slice(0, 8)),
};

export const chatStore = {
  list: <T,>() => read<T[]>("chat", []),
  save: (items: unknown[]) => write("chat", items.slice(-60)),
};

/** Bytes used per app area on this device (UTF-16 → ~2 bytes per char). */
export function storageUsage(): Record<StoreKey, number> {
  const out = {} as Record<StoreKey, number>;
  for (const key of Object.keys(KEYS) as StoreKey[]) {
    let size = 0;
    try {
      size = (window.localStorage.getItem(KEYS[key])?.length ?? 0) * 2;
    } catch {
      size = 0;
    }
    out[key] = size;
  }
  return out;
}

/** Clears user data only. Bundled knowledge and any installed models are never touched. */
export function clearUserData(scope: "history" | "saved" | "chat" | "all") {
  if (scope === "history" || scope === "all") {
    write("scans", []);
    write("events", []);
  }
  if (scope === "saved" || scope === "all") write("saved", []);
  if (scope === "chat" || scope === "all") write("chat", []);
  if (scope === "all") {
    write("reminders", []);
    write("recent", []);
  }
}

/**
 * Creates an AES-GCM 256-bit encrypted backup of all on-device data and triggers download
 */
export async function exportEncryptedBackupFile(passphrase?: string): Promise<string> {
  const fullState = {
    scans: historyService.list(),
    reminders: reminderService.list(),
    saved: savedService.list(),
    settings: [settingsService.load()],
    profile: settingsService.load(),
    chat: chatStore.list(),
  };

  const backupPackage = await createEncryptedBackup(fullState, passphrase);
  const blob = new Blob([JSON.stringify(backupPackage, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `cropcare-encrypted-backup-${dateStr}.cropcare`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return JSON.stringify(backupPackage);
}

/**
 * Restores all on-device data from an AES-GCM 256-bit encrypted backup archive
 */
export async function importEncryptedBackupFile(
  fileContent: string,
  passphrase?: string
): Promise<{ success: boolean; scansRestored: number }> {
  try {
    const backupPackage = JSON.parse(fileContent) as CropCareEncryptedBackup;
    const restored = await restoreEncryptedBackup(backupPackage, passphrase);

    if (Array.isArray(restored.scans)) {
      historyService.save(restored.scans as Scan[]);
    }
    if (Array.isArray(restored.reminders)) {
      reminderService.save(restored.reminders as Reminder[]);
    }
    if (Array.isArray(restored.saved)) {
      savedService.save(restored.saved as SavedItem[]);
    }
    if (Array.isArray(restored.settings) && restored.settings[0]) {
      settingsService.save(restored.settings[0] as Settings);
    }
    if (Array.isArray(restored.chat)) {
      chatStore.save(restored.chat);
    }

    return {
      success: true,
      scansRestored: Array.isArray(restored.scans) ? restored.scans.length : 0,
    };
  } catch (err) {
    console.error("Backup restoration failed:", err);
    throw err;
  }
}

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
