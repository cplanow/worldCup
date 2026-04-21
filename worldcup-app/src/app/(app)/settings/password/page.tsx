import { requireSessionOrRedirect } from "@/lib/session";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";

export default async function PasswordSettingsPage() {
  await requireSessionOrRedirect();

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Change password</h1>
      <p className="mb-6 text-sm text-slate-600">
        Pick a new password. Signing in on other devices will require the new
        one.
      </p>
      <PasswordChangeForm />
    </div>
  );
}
