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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 rounded-2xl bg-white/10 backdrop-blur-sm p-6 border border-white/10">
      <p className="text-center text-sm text-[#8BAF9E] mb-4">
        Welcome back, <span className="font-semibold text-[#D4AF37]">{username}</span>! Please set a password to secure your account.
      </p>
      <Input
        name="password"
        type="password"
        placeholder="Password"
        required
        autoComplete="new-password"
        autoFocus
        className="h-12 text-center text-base bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:ring-[#D4AF37]/30"
      />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm password"
        required
        autoComplete="new-password"
        className="h-12 text-center text-base bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:ring-[#D4AF37]/30"
      />
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 bg-[#D4AF37] text-base font-semibold text-[#0F2E23] hover:bg-[#C9A832] disabled:bg-white/10 disabled:text-white/30 rounded-xl"
      >
        {isSubmitting ? "Setting password..." : "Set Password"}
      </Button>
    </form>
  );
}
