// Pure form logic for the care-recipient Settings section (App SETUP: keep domain logic framework-
// agnostic and unit-tested, Decisions.md D10). No React, no DOM, no api: it turns a CareRecipientProfile
// into editable form state, applies the SAME family rules the onboarding uses (Sensory + Transitions
// multi-select sharing a 10-tag cap; Communication + Recovery single-select, outside the cap; the cap is
// UI-only, the api stores every tag), and diffs the edited state back to the partial CareRecipientUpdate
// the api's PUT expects. The tag rules live here once so the Settings form and onboarding agree; the
// option lists and the cap are imported from the onboarding taxonomy, never re-declared.

import type {
  CareRecipientProfile,
  CareRecipientUpdate,
  SupportLevelCode,
  TagCode,
} from "@/lib/api/types";
import { COMBINED_TAG_CAP } from "@/features/onboarding/taxonomy";

/** The editable shape of a care recipient. Mirrors the fields the api PUT accepts (no id/timestamps). */
export interface ChildFormState {
  name: string;
  ageBand: string | null;
  supportLevel: SupportLevelCode;
  /** All selected tag codes across the four permanent families (the api stores them as one list). */
  tags: TagCode[];
}

/** Build the initial form state from the loaded care recipient. */
export function toChildForm(child: CareRecipientProfile): ChildFormState {
  return {
    name: child.name,
    ageBand: child.age_band,
    supportLevel: child.support_level_code,
    tags: [...child.tags],
  };
}

/** Which permanent family a tag code belongs to (by its code prefix). Triggers (TG-) are not profile tags. */
export type TagFamilyKey = "sensory" | "transitions" | "communication" | "recovery";

export function familyOf(code: TagCode): TagFamilyKey | null {
  if (code.startsWith("SN-")) return "sensory";
  if (code.startsWith("TR-")) return "transitions";
  if (code.startsWith("CM-")) return "communication";
  if (code.startsWith("RC-")) return "recovery";
  return null;
}

/** Count of Sensory + Transitions tags (the families that share the 10-tag cap). */
export function cappedTagCount(tags: TagCode[]): number {
  return tags.filter((code) => {
    const family = familyOf(code);
    return family === "sensory" || family === "transitions";
  }).length;
}

/** True when the shared Sensory + Transitions cap (10) is reached; the UI disables unselected pills. */
export function isCapReached(tags: TagCode[]): boolean {
  return cappedTagCount(tags) >= COMBINED_TAG_CAP;
}

/**
 * Toggle a tag, honouring its family's selection rule, returning the new tags list (never mutating):
 *   - Sensory / Transitions (multi-select): add if room under the shared cap, remove if present.
 *     An add that would breach the cap is refused (the same guard onboarding applies).
 *   - Communication / Recovery (single-select): selecting one replaces any other tag from that family;
 *     tapping the selected one again clears it. These sit outside the cap.
 * Order is preserved for the unaffected codes so a round-trip is stable.
 */
export function toggleTag(tags: TagCode[], code: TagCode): TagCode[] {
  const family = familyOf(code);
  if (family === null) return tags;

  const present = tags.includes(code);

  if (family === "communication" || family === "recovery") {
    // Single-select: drop any existing tag in this family, then add the tapped one unless it was the
    // one already selected (in which case the tap clears the family).
    const withoutFamily = tags.filter((c) => familyOf(c) !== family);
    return present ? withoutFamily : [...withoutFamily, code];
  }

  // Multi-select Sensory / Transitions, under the shared cap.
  if (present) {
    return tags.filter((c) => c !== code);
  }
  if (isCapReached(tags)) {
    return tags; // at the cap: adding is refused (deselect still works above)
  }
  return [...tags, code];
}

/** True when the form differs from the loaded recipient (drives the Save button's enabled state). */
export function hasChildChanges(
  original: CareRecipientProfile,
  form: ChildFormState
): boolean {
  return Object.keys(buildChildUpdate(original, form)).length > 0;
}

/** Compare two tag lists ignoring order (the api treats tags as a set). */
function sameTags(a: TagCode[], b: TagCode[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((code) => setB.has(code));
}

/**
 * Diff the edited form against the loaded recipient into the partial update the api PUT expects: only
 * the changed fields are included (the api 400s on an empty body, so the caller checks hasChildChanges
 * first). The name is trimmed; an empty trimmed name is NOT emitted (the api requires min_length 1, and
 * the UI blocks saving an empty name). age_band can be cleared (null) and that is a real change.
 */
export function buildChildUpdate(
  original: CareRecipientProfile,
  form: ChildFormState
): CareRecipientUpdate {
  const update: CareRecipientUpdate = {};

  const name = form.name.trim();
  if (name.length > 0 && name !== original.name) {
    update.name = name;
  }

  if (form.ageBand !== original.age_band) {
    update.age_band = form.ageBand;
  }

  if (form.supportLevel !== original.support_level_code) {
    update.support_level_code = form.supportLevel;
  }

  if (!sameTags(form.tags, original.tags)) {
    update.tags = form.tags;
  }

  return update;
}
