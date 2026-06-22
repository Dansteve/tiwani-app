// Centralized env access. The api base URL and the Supabase config come from NEXT_PUBLIC_* vars
// (statically inlined at build time by Next). This is the only module that reads them, so the rest
// of the data layer stays framework-agnostic (no process.env scattered through the client). See
// Docs/Decisions.md D10 (keep lib/ portable for a future React Native app).

function read(name: string): string {
  // process.env.<NAME> is inlined by Next at build for NEXT_PUBLIC_* keys; the indexed form is not,
  // so each key is referenced literally.
  switch (name) {
    case "NEXT_PUBLIC_API_URL":
      return process.env.NEXT_PUBLIC_API_URL ?? "";
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    case "NEXT_PUBLIC_WEBSITE_URL":
      return process.env.NEXT_PUBLIC_WEBSITE_URL ?? "";
    case "NEXT_PUBLIC_CARD_ON_TASK_ENABLED":
      return process.env.NEXT_PUBLIC_CARD_ON_TASK_ENABLED ?? "";
    case "NEXT_PUBLIC_GENTLER_ENABLED":
      return process.env.NEXT_PUBLIC_GENTLER_ENABLED ?? "";
    default:
      return "";
  }
}

/**
 * The card-on-task SIGN-OFF GATE (default OFF): the owner may attach the recipient's Continuity Card to
 * a Village task, visible only to the claimer (FeatureDecisions 2026-06-17). It is a directed disclosure
 * of a child's support card, so it stays OFF until the human DPO + psychiatrist sign-off + the DPIA
 * clear. The api has the matching CARD_ON_TASK_ENABLED gate; the feature is dormant unless BOTH are on.
 * True only for an explicit truthy build value ("1" / "true" / "yes" / "on").
 */
export function isCardOnTaskEnabled(): boolean {
  const v = read("NEXT_PUBLIC_CARD_ON_TASK_ENABLED").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * The "go gentler today" view control GATE (default OFF): the optional, user-flipped re-presentation of the
 * plan result (lead with the calmest approach; the SAME plan, nothing recomputed, a quieter score). It is a
 * care-adjacent copy surface, so it stays OFF until the psychiatrist copy sign-off clears the wording; if
 * the board rejects it, leaving the flag OFF keeps it hidden with no code change. True only for an explicit
 * truthy build value ("1" / "true" / "yes" / "on").
 */
export function isGentlerEnabled(): boolean {
  const v = read("NEXT_PUBLIC_GENTLER_ENABLED").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export const env = {
  /** Base URL of tiwani-api (e.g. https://api.tiwani... or http://localhost:8002). */
  apiUrl: read("NEXT_PUBLIC_API_URL"),
  /** Supabase project URL. */
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  /** Supabase anon (publishable) key. */
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  /**
   * The marketing website's URL (the landing page the app links "home" back to). The app and website
   * are separate Firebase sites, so this is a cross-origin link. Mirrors the website's own APP_URL
   * config: local dev points at the local website, production at the Firebase-hosted site. Override
   * with NEXT_PUBLIC_WEBSITE_URL (e.g. a custom domain like tiwanilife.com later).
   */
  websiteUrl:
    read("NEXT_PUBLIC_WEBSITE_URL") ||
    (process.env.NODE_ENV === "production"
      ? "https://tiwani-main.web.app"
      : "http://localhost:5174"),
};
