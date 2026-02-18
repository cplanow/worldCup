"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createUser } from "@/lib/actions/auth";

export function UsernameForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;

    const result = await createUser(username);

    if (result.success) {
      router.push("/bracket");
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <Input
        name="username"
        type="text"
        placeholder="Enter your name"
        required
        autoComplete="off"
        autoFocus
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
        {isSubmitting ? "Submitting..." : "Enter"}
      </Button>
    </form>
  );
}
