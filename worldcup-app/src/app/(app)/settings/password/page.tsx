import { requireSessionOrRedirect } from "@/lib/session";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";

export default async function PasswordSettingsPage() {
  await requireSessionOrRedirect();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
          Settings
        </p>
        <h1 className="mt-1 text-display-sm text-text">Account security</h1>
        <p className="mt-2 text-sm text-text-muted">
          Keep your account safe. Picking a stronger password takes a few
          seconds and protects your bracket.
        </p>
      </div>
      <PasswordChangeForm />
    </div>
  );
}
