"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { consumePasswordResetToken } from "@/lib/actions/auth";

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
      className="flex w-full flex-col gap-4 rounded-2xl bg-white/10 backdrop-blur-sm p-6 border border-white/10"
    >
      <Input
        name="newPassword"
        type="password"
        placeholder="New password"
        required
        autoComplete="new-password"
        autoFocus
        className="h-12 text-center text-base bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:ring-[#D4AF37]/30"
      />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        required
        autoComplete="new-password"
        className="h-12 text-center text-base bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:ring-[#D4AF37]/30"
      />
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 bg-[#D4AF37] text-base font-semibold text-[#0F2E23] hover:bg-[#C9A832] disabled:bg-white/10 disabled:text-white/30 rounded-xl"
      >
        {isSubmitting ? "Saving..." : "Save password"}
      </Button>
    </form>
  );
}
