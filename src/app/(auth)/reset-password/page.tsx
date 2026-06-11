// Password-reset request route (Product.md §4.1). Full-screen pre-session page in the (auth) group;
// client-rendered (Supabase Auth runs in the browser on the static export).

import { ResetRequestForm } from "@/features/auth/ResetRequestForm";

export default function ResetPasswordPage() {
  return <ResetRequestForm />;
}
