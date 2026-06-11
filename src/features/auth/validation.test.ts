// Auth form validation tests (Product.md §4.1: first name required, valid email, password min 8).
// Pure logic, no DOM, no live auth (the sandbox cannot reach Supabase).

import { describe, it, expect } from "vitest";

import {
  isValidEmail,
  isValidPassword,
  isValidFirstName,
  validateSignUp,
  validateSignIn,
  hasErrors,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/validation";

describe("auth validation", () => {
  it("validates email shape", () => {
    expect(isValidEmail("ada@example.com")).toBe(true);
    expect(isValidEmail("  ada@example.com  ")).toBe(true);
    expect(isValidEmail("ada@example")).toBe(false);
    expect(isValidEmail("ada.example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("requires a password of at least the minimum length", () => {
    expect(isValidPassword("a".repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(isValidPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
  });

  it("requires a non-empty first name", () => {
    expect(isValidFirstName("Ada")).toBe(true);
    expect(isValidFirstName("   ")).toBe(false);
  });

  it("collects sign-up errors per field", () => {
    const errors = validateSignUp({ firstName: "", email: "nope", password: "short" });
    expect(errors.firstName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(hasErrors(errors)).toBe(true);

    const ok = validateSignUp({
      firstName: "Ada",
      email: "ada@example.com",
      password: "longenough",
    });
    expect(hasErrors(ok)).toBe(false);
  });

  it("collects sign-in errors (password just needs to be present)", () => {
    const errors = validateSignIn({ email: "bad", password: "" });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();

    const ok = validateSignIn({ email: "ada@example.com", password: "x" });
    expect(hasErrors(ok)).toBe(false);
  });
});
