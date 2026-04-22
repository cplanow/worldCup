"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { consumePasswordResetToken } from "@/lib/actions/auth";
import { AuthErrorBanner } from "./auth/AuthErrorBanner";

interface Props {
  token: string;
}

export function ForgotPasswordResetForm({ token }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    const result = await consumePasswordResetToken({ token, newPassword });

    if (result.success) {
      const { bracketSubmitted, isLocked } = result.data;
      if (bracketSubmitted) {
        router.push("/leaderboard");
      } else if (isLocked) {
        router.push("/leaderboard?locked=1");
      } else {
        router.push("/bracket");
      }
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 animate-fade-in"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">New password</span>
        <Input
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          autoFocus
          className="h-11"
        />
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
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 bg-brand text-text-on-brand transition-transform duration-150 hover:bg-brand-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Save password"}
      </Button>
    </form>
  );
}
