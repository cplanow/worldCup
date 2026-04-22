"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/lib/actions/auth";
import {
  glassInputClass,
  glassSubmitClass,
  glassSwitchClass,
} from "./auth/authStyles";
import { AuthErrorBanner } from "./auth/AuthErrorBanner";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    const result = await registerUser(username, password);

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
      className="flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/10 p-6 shadow-[var(--shadow-elevated)] backdrop-blur-md animate-fade-in"
    >
      <Input
        name="username"
        type="text"
        placeholder="Username"
        required
        autoComplete="username"
        autoFocus
        aria-label="Username"
        className={glassInputClass}
      />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        required
        autoComplete="new-password"
        aria-label="Password"
        className={glassInputClass}
      />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm password"
        required
        autoComplete="new-password"
        aria-label="Confirm password"
        className={glassInputClass}
      />
      <AuthErrorBanner message={error} onDismiss={() => setError("")} />
      <Button
        type="submit"
        disabled={isSubmitting}
        className={glassSubmitClass}
      >
        {isSubmitting ? "Creating..." : "Create Account"}
      </Button>
      <button
        type="button"
        onClick={onSwitchToLogin}
        className={glassSwitchClass}
      >
        Already have an account? Log in
      </button>
    </form>
  );
}
