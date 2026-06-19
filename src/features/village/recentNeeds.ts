// A small, DEVICE-LOCAL history of the Coordinator's recently posted Village needs, so the post-a-need
// form can offer "tap a recent request to reuse it" and the Coordinator does not retype the same
// what / where / contact for a recurring task (the owner's "repopulate most fields" ask).
//
// Stored in localStorage: the OWNER's own device, the OWNER's own data, NEVER sent to the server and
// NEVER shared with the village (this is browser-autofill-grade convenience, not product data about the
// recipient). Scoped per recipient, capped, deduped by title, SSR / private-mode safe. The bounded WINDOW
// fields (starts_at / ends_at) are deliberately NOT stored: a time is task-specific and always set fresh.

export interface RecentNeed {
  title: string;
  detail: string;
  area_label: string;
  location_text: string;
  contact_name: string;
  contact_phone: string;
}

export const MAX_RECENT_NEEDS = 5;
const KEY_PREFIX = "tiwani.village.recentNeeds.";

function storageKey(recipientId: string): string {
  return `${KEY_PREFIX}${recipientId}`;
}

// localStorage can throw (SSR: no window; Safari private mode: SecurityError). Every access is guarded so
// the feature degrades to "no recents" rather than crashing the form.
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecentNeed(value: unknown): value is RecentNeed {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RecentNeed).title === "string" &&
    (value as RecentNeed).title.trim().length > 0
  );
}

/** Load this recipient's recent posted needs, newest first (capped). Never throws. */
export function loadRecentNeeds(recipientId: string): RecentNeed[] {
  const store = safeStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(storageKey(recipientId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecentNeed)
      .map((n) => ({
        title: n.title,
        detail: typeof n.detail === "string" ? n.detail : "",
        area_label: typeof n.area_label === "string" ? n.area_label : "",
        location_text: typeof n.location_text === "string" ? n.location_text : "",
        contact_name: typeof n.contact_name === "string" ? n.contact_name : "",
        contact_phone: typeof n.contact_phone === "string" ? n.contact_phone : "",
      }))
      .slice(0, MAX_RECENT_NEEDS);
  } catch {
    return [];
  }
}

/**
 * Save a just-posted need to the FRONT of the list (newest first), deduped by title (case-insensitive),
 * capped at MAX_RECENT_NEEDS. Returns the new list so the caller can update state without a re-read. A
 * need with an empty title is not stored (title is the one required field).
 */
export function saveRecentNeed(recipientId: string, need: RecentNeed): RecentNeed[] {
  const cleaned: RecentNeed = {
    title: need.title.trim(),
    detail: need.detail.trim(),
    area_label: need.area_label.trim(),
    location_text: need.location_text.trim(),
    contact_name: need.contact_name.trim(),
    contact_phone: need.contact_phone.trim(),
  };
  if (cleaned.title.length === 0) return loadRecentNeeds(recipientId);

  const withoutDuplicate = loadRecentNeeds(recipientId).filter(
    (n) => n.title.toLowerCase() !== cleaned.title.toLowerCase()
  );
  const next = [cleaned, ...withoutDuplicate].slice(0, MAX_RECENT_NEEDS);

  const store = safeStorage();
  if (store) {
    try {
      store.setItem(storageKey(recipientId), JSON.stringify(next));
    } catch {
      // Private mode / quota exceeded: a convenience feature, so a failed save is silently fine.
    }
  }
  return next;
}

/** Forget one recent need (the owner taps the "x" on a chip). Returns the new list. */
export function removeRecentNeed(recipientId: string, title: string): RecentNeed[] {
  const next = loadRecentNeeds(recipientId).filter(
    (n) => n.title.toLowerCase() !== title.trim().toLowerCase()
  );
  const store = safeStorage();
  if (store) {
    try {
      store.setItem(storageKey(recipientId), JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}
