// Sign-in route (Product.md §4.1). Full-screen pre-session page in the (auth) group; client-rendered
// because Supabase Auth runs in the browser on the static export.

import { SignInForm } from "@/features/auth/SignInForm";

export default function SignInPage() {
  return <SignInForm />;
}
