import { createHash } from "node:crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ForgotPasswordResetForm } from "@/components/ForgotPasswordResetForm";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ForgotPasswordPage({ params }: PageProps) {
  const { token } = await params;

  // Server-side validation so we can render a helpful error before the user
  // types a new password. The action validates again at submit time — this
  // is just for UX.
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  const user = await db
    .select()
    .from(users)
    .where(eq(users.resetTokenHash, tokenHash))
    .get();

  const now = Date.now();
  const expiresAt = user?.resetTokenExpiresAt
    ? Date.parse(user.resetTokenExpiresAt)
    : null;
  const valid =
    !!user &&
    !!user.resetTokenHash &&
    !!expiresAt &&
    Number.isFinite(expiresAt) &&
    expiresAt > now;

  if (!valid) {
    return (
      <div className="min-h-screen bg-[#0F2E23] flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl bg-white/10 p-8 text-center backdrop-blur-sm">
          <h1 className="font-display text-2xl font-bold text-[#D4AF37]">
            Link invalid
          </h1>
          <p className="mt-3 text-sm text-white/80">
            This password reset link has expired or already been used. Ask the
            pool admin for a fresh one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F2E23] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-display mb-2 text-center text-3xl font-bold text-[#D4AF37]">
          Set a new password
        </h1>
        <p className="mb-6 text-center text-sm text-white/70">
          You'll be signed in automatically after saving.
        </p>
        <ForgotPasswordResetForm token={token} />
      </div>
    </div>
  );
}
