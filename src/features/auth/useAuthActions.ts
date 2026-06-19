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
          // Land on the set-new-password screen, which reads the one-time recovery session from the link.
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/update-password`
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

  const updatePassword = useCallback(
    async (password: string): Promise<AuthResult> => {
      setPending(true);
      try {
        const supabase = getSupabaseClient();
        // The caller is in a one-time recovery session (opened from the reset link); set the new
        // password on it. Supabase keeps them signed in, so the screen can route on into the app.
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { ok: false, error: messageFrom(error, "Could not update your password.") };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error, "Could not update your password.") };
      } finally {
        setPending(false);
      }
    },
    []
  );

  const signInWithMagicLink = useCallback(
    async (email: string): Promise<AuthResult> => {
      setPending(true);
      try {
        const supabase = getSupabaseClient();
        // A passwordless sign-in for an EXISTING account: Supabase emails a one-time link + code (the
        // magic_link template). shouldCreateUser is false so it never creates an account, because
        // sign-up requires a first name (Product.md §4.1); this only signs in someone who has one.
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/dashboard`
                : undefined,
          },
        });
        if (error) return { ok: false, error: messageFrom(error, "Could not send the sign-in link.") };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error, "Could not send the sign-in link.") };
      } finally {
        setPending(false);
      }
    },
    []
  );

  const changeEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      setPending(true);
      try {
        const supabase = getSupabaseClient();
        // Start an email change (Supabase identity): it emails a confirmation to the new address (the
        // email_change template); the change applies only once that link is opened. The link returns
        // to the app. The api profile email follows on the next read after confirmation.
        const { error } = await supabase.auth.updateUser(
          { email },
          {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/dashboard`
                : undefined,
          }
        );
        if (error) return { ok: false, error: messageFrom(error, "Could not start the email change.") };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error, "Could not start the email change.") };
      } finally {
        setPending(false);
      }
    },
    []
  );

  const reauthenticate = useCallback(async (): Promise<AuthResult> => {
    setPending(true);
    try {
      const supabase = getSupabaseClient();
      // Email a one-time confirmation code (the reauthentication template) to the signed-in user, to
      // confirm identity before a sensitive action. The code is consumed by confirmReauthentication.
      const { error } = await supabase.auth.reauthenticate();
      if (error) return { ok: false, error: messageFrom(error, "Could not send the confirmation code.") };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFrom(error, "Could not send the confirmation code.") };
    } finally {
      setPending(false);
    }
  }, []);

  const confirmReauthentication = useCallback(
    async (nonce: string): Promise<AuthResult> => {
      setPending(true);
      try {
        const supabase = getSupabaseClient();
        // Validate the emailed code by attaching the nonce to a harmless metadata write: it succeeds
        // only when the code is valid (and not expired), so a caller can gate a sensitive action on it.
        const { error } = await supabase.auth.updateUser({
          nonce,
          data: { reauthenticated_at: new Date().toISOString() },
        });
        if (error) return { ok: false, error: messageFrom(error, "That code did not match. Please try again.") };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error, "That code did not match. Please try again.") };
      } finally {
        setPending(false);
      }
    },
    []
  );

  const changePassword = useCallback(
    async (params: {
      email: string;
      currentPassword: string;
      newPassword: string;
    }): Promise<AuthResult> => {
      setPending(true);
      try {
        const supabase = getSupabaseClient();
        // Confirm it is really the account holder by re-checking the CURRENT password (Supabase
        // validates it on sign-in), so a stranger on an unlocked device cannot reset it; then set the
        // new one. A wrong current password is rejected before any change. No credential is stored.
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: params.email,
          password: params.currentPassword,
        });
        if (verifyError) {
          return { ok: false, error: "Your current password does not match. Please try again." };
        }
        const { error } = await supabase.auth.updateUser({ password: params.newPassword });
        if (error) return { ok: false, error: messageFrom(error, "Could not update your password.") };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error, "Could not update your password.") };
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

  return {
    pending,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    requestPasswordReset,
    updatePassword,
    changePassword,
    changeEmail,
    reauthenticate,
    confirmReauthentication,
    signOut,
  };
}
