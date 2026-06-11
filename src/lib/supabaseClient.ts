// The Supabase Auth SDK client: identity only (sign-up, sign-in email + Google, sign-out, session,
// password reset). All product data goes through the typed api client (lib/api/client.ts); this
// owns auth alone. No password is ever stored, hashed, or compared client-side (Decisions.md D1;
// the prototype's plaintext-password store is removed).
//
// This is the web identity layer, so it imports the browser SDK (unlike lib/api/, which stays
// framework-agnostic for React Native, Decisions.md D10). It is the skeleton: not wired to a live
// project until the Supabase env is configured.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * The singleton Supabase browser client. Created lazily so a missing env config fails at call time
 * with a clear message rather than at module load (which would break the static build).
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured (set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/**
 * Returns the current session access token, or null when signed out. This is the token provider the
 * api client uses to attach the Authorization bearer (see setAuthTokenProvider).
 */
export async function getAccessToken(): Promise<string | null> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  return session?.access_token ?? null;
}
