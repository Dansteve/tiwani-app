// Pure client-side validation for the auth forms (Product.md §4.1: first name required, valid email,
// password min 8). Framework-agnostic, no DOM, so it is unit-testable and reusable (Decisions.md
// D10). This guards the form for a fast, clear UX; the api and Supabase remain the real authority on
// credentials (the client never trusts itself for security, it just avoids a pointless round trip).

/** Minimum password length (Product.md §4.1). */
export const MIN_PASSWORD_LENGTH = 8;

// A deliberately permissive email shape: "something@something.something". Real verification is the
// confirmation email; this only catches obvious typos before a network call.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH;
}

export function isValidFirstName(value: string): boolean {
  return value.trim().length > 0;
}

export interface SignUpErrors {
  firstName?: string;
  email?: string;
  password?: string;
}

/** Validate the sign-up form; returns a (possibly empty) map of field -> message. */
export function validateSignUp(values: {
  firstName: string;
  email: string;
  password: string;
}): SignUpErrors {
  const errors: SignUpErrors = {};
  if (!isValidFirstName(values.firstName)) {
    errors.firstName = "Please tell us your first name.";
  }
  if (!isValidEmail(values.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!isValidPassword(values.password)) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return errors;
}

export interface SignInErrors {
  email?: string;
  password?: string;
}

export function validateSignIn(values: {
  email: string;
  password: string;
}): SignInErrors {
  const errors: SignInErrors = {};
  if (!isValidEmail(values.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (values.password.length === 0) {
    errors.password = "Please enter your password.";
  }
  return errors;
}

/** True when any field in an error map carries a message (works on the typed error shapes above). */
export function hasErrors<T extends object>(errors: T): boolean {
  return Object.values(errors).some(Boolean);
}
