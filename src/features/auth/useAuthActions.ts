"use client";

// The auth actions hook: a thin wrapper over the Supabase Auth SDK for the sign-up, sign-in, Google,
// and password-reset flows (Product.md §4.1; HardRules/App/Modules/Onboarding.md, Services.md). It is
// the only place the screens touch the SDK; the live session itself is owned by AuthProvider (state/),
// which the api client reads its bearer from. No credential is ever stored, hashed, or compared
// client-side (Decisions.md D1): Supabase holds identity, this just calls it.
//
// first_name is required at sign-up and is stored in the auth user's metadata so the api can create
// the user_profile row with it (the greeting uses it). On sign-up success the caller routes to
// onboarding, never straight to the dashboard.

import { useCallback, useState } from "react";

import { getSupabaseClient } from "@/lib/supabaseClient";

/** A normalized result so screens render one error shape regardless of the SDK's error type. */
export interface AuthResult {
  ok: boolean;
  /** A human-readable message to surface (toast or inline) when ok is false. */
  error?: string;
  /** True after sign-up when the project requires email confirmation before a session exists. */
  needsEmailConfirmation?: boolean;
}

/** Turn any thrown/returned Supabase error into a calm, plain-English message. */
function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message) return message;
  }
  return fallback;
}

export function useAuthActions() {
  const [pending, setPending] = useState(false);

  const signUp = useCallback(
    async (params: {
      firstName: string;
      email: string;
      password: string;
    }): Promise<AuthResult> => {
      setPending(true);
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            // Stored on auth.users.user_metadata; the api reads it to seed user_profile.first_name.
            data: { first_name: params.firstName.trim() },
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/onboarding`
                : undefined,
          },
        });
        if (error) return { ok: false, error: messageFrom(error, "Could not create your account.") };
        // When confirmation is on, there is a user but no session until the email link is clicked.
        const needsEmailConfirmation = Boolean(data.user) && !data.session;
        return { ok: true, needsEmailConfirmation };
      } catch (error) {
        return { ok: false, error: messageFrom(error, "Could not create your account.") };
      } finally {
        setPending(false);
      }
    },
    []
  );

  const signIn = useCallback(
    async (params: { email: string; password: string }): Promise<AuthResult> => {
      setPending(true);
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: params.email,
          password: params.password,
        });
        if (error) return { ok: false, error: messageFrom(error, "Could not sign you in.") };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error, "Could not sign you in.") };
      } finally {
        setPending(false);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setPending(true);
    try {
      const supabase = getSupabaseClient();
      // OAuth redirects away; on return the session is detected and AuthProvider routes by session.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/onboarding`
              : undefined,
        },
      });
      if (error) return { ok: false, error: messageFrom(error, "Could not start Google sign-in.") };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFrom(error, "Could not start Google sign-in.") };
    } finally {
      setPending(false);
    }
  }, []);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<AuthResult> => {
      setPending(true);
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/sign-in`
              : undefined,
        });
        if (error) return { ok: false, error: messageFrom(error, "Could not send the reset email.") };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error, "Could not send the reset email.") };
      } finally {
        setPending(false);
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<AuthResult> => {
    setPending(true);
    try {
      const supabase = getSupabaseClient();
      // Clears the local session + revokes it server-side; AuthProvider then sees no session and the
      // (app) layout sends the user to sign-in. The caller also routes explicitly for an instant exit.
      const { error } = await supabase.auth.signOut();
      if (error) return { ok: false, error: messageFrom(error, "Could not sign you out.") };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFrom(error, "Could not sign you out.") };
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, signUp, signIn, signInWithGoogle, requestPasswordReset, signOut };
}
