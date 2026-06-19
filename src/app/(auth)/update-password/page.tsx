// Set-new-password route (Product.md §4.1): where the password-reset email link lands. Client-rendered
// (Supabase Auth runs in the browser on the static export), in the (auth) group so no app guard bounces
// the one-time recovery session before the Coordinator sets a new password.

import { UpdatePasswordForm } from "@/features/auth/UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />;
}
