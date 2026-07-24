/**
 * Auto-save utilities for BBCode editor content and image conversion history.
 * Uses localStorage — everything stays on the client, no server involved.
 * Silent by design: the user "should be safe and not care if it doesn't save".
 */

const STORAGE_KEYS = {
  EDITOR_TEXT: "bbcode-editor-text",
  CONVERSIONS: "bbcode-conversions",
  SAVED_AT: "bbcode-saved-at",
} as const;

/** Saved conversion entry */
export interface SavedConversion {
  id: string;
  originalUrl: string;
  newUrl: string;
  thumbnailUrl?: string;
  success: boolean;
  error?: string;
  savedAt: number; // timestamp
}

// ─── Editor text ────────────────────────────────────────────────────────────

export function saveEditorText(text: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EDITOR_TEXT, text);
    localStorage.setItem(STORAGE_KEYS.SAVED_AT, Date.now().toString());
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadEditorText(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.EDITOR_TEXT) || "";
  } catch {
    return "";
  }
}

// ─── Conversion history ─────────────────────────────────────────────────────

export function loadConversions(): SavedConversion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedConversion[];
  } catch {
    return [];
  }
}

export function saveConversions(conversions: SavedConversion[]): void {
  try {
    // Keep at most 100 entries to avoid bloating localStorage
    const trimmed = conversions.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.CONVERSIONS, JSON.stringify(trimmed));
  } catch {
    // Silently fail
  }
}

// ─── Save indicator ─────────────────────────────────────────────────────────

export function getLastSavedTimestamp(): number | null {
  try {
    const t = localStorage.getItem(STORAGE_KEYS.SAVED_AT);
    return t ? parseInt(t, 10) : null;
  } catch {
    return null;
  }
}

// ─── Reset / Clear all ──────────────────────────────────────────────────────

/**
 * Wipe every piece of data this app stores in localStorage.
 * Used by the "Reset All" button with confirmation.
 */
export function clearAllData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    // Silently fail
  }
}
