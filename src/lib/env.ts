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
    default:
      return "";
  }
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
