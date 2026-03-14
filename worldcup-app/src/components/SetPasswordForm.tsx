"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setPassword } from "@/lib/actions/auth";

interface SetPasswordFormProps {
  username: string;
}

export function SetPasswordForm({ username }: SetPasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    const result = await setPassword(username, password);

    if (result.success) {
      router.push("/bracket");
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="text-center text-sm text-slate-600">
        Welcome back, {username}! Please set a password to secure your account.
      </p>
      <Input
        name="password"
        type="password"
        placeholder="Password"
        required
        autoComplete="new-password"
        autoFocus
        className="h-12 text-center text-base"
      />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm password"
        required
        autoComplete="new-password"
        className="h-12 text-center text-base"
      />
      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 bg-slate-900 text-base font-semibold text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
      >
        {isSubmitting ? "Setting password..." : "Set Password"}
      </Button>
    </form>
  );
}
