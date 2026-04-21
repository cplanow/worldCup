"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/actions/auth";

export function PasswordChangeForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setIsSubmitting(false);
      return;
    }

    const result = await changePassword({ currentPassword, newPassword });

    if (result.success) {
      setSuccess(true);
      e.currentTarget.reset();
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">
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
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">New password</span>
        <Input
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          className="h-11"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-600">
          Password updated. Other devices will need to sign in again.
        </p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 bg-[#0F2E23] text-white hover:bg-[#0A2018] disabled:bg-slate-200 disabled:text-slate-400"
      >
        {isSubmitting ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
