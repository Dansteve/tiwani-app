// Sign-up route (Product.md §4.1). The (auth) group sits outside the (app) shell (no sidebar/tabs):
// these are full-screen, pre-session pages. The screen is a client component (Supabase Auth runs in
// the browser; the app is a static export, so there is no server action here).

import { SignUpForm } from "@/features/auth/SignUpForm";

export default function SignUpPage() {
  return <SignUpForm />;
}
