"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { changePassword } from "@/lib/actions/auth";

// 0 = none, 1 = weak, 2 = okay, 3 = good, 4 = strong
function scorePassword(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

const strengthLabels = ["", "Weak", "Okay", "Good", "Strong"] as const;
const strengthBarClasses = [
  "",
  "w-1/4 bg-error",
  "w-2/4 bg-warning",
  "w-3/4 bg-success",
  "w-full bg-success",
];

export function PasswordChangeForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = scorePassword(newPassword);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const nextNewPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (nextNewPassword !== confirmPassword) {
      setError("New passwords do not match");
      setIsSubmitting(false);
      return;
    }

    const result = await changePassword({
      currentPassword,
      newPassword: nextNewPassword,
    });

    if (result.success) {
      setSuccess(true);
      setNewPassword("");
      e.currentTarget.reset();
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <Card padding="lg" className="animate-fade-in">
      <SectionHeader
        size="sm"
        title="Change password"
        subtitle="Other signed-in devices will need the new password."
      />
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">
              Current password
            </span>
            <Input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="h-11"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">
              New password
            </span>
            <Input
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-describedby="password-strength"
              className="h-11"
            />
            <div id="password-strength" className="mt-1">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full transition-all duration-200 ${strengthBarClasses[strength]}`}
                />
              </div>
              <p className="mt-1 text-xs text-text-muted" role="status">
                {strength > 0
                  ? `Strength: ${strengthLabels[strength]}`
                  : "Use 8+ characters, mix cases, digits, and symbols."}
              </p>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">
              Confirm new password
            </span>
            <Input
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="h-11"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error-bg px-3 py-2 text-sm text-error animate-fade-in"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="rounded-lg border border-success/30 bg-success-bg px-3 py-2 text-sm text-success animate-fade-in"
            >
              Password updated. Other devices will need to sign in again.
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 bg-brand text-text-on-brand transition-transform duration-150 hover:bg-brand-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
