import { createHash } from "node:crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ForgotPasswordResetForm } from "@/components/ForgotPasswordResetForm";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-gradient px-6 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 h-[360px] w-[360px] rounded-full bg-accent/10 blur-3xl"
      />

      <main className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-6 text-center">
          <h1 className="text-display-md font-display text-accent">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-text-on-brand/80">
            worldCup Bracket Pool 2026
          </p>
        </div>

        {valid ? (
          <Card padding="lg">
            <SectionHeader
              size="sm"
              title="Set your new password"
              subtitle="You'll be signed in automatically after saving."
              action={<Badge variant="success">Link valid</Badge>}
            />
            <CardContent>
              <ForgotPasswordResetForm token={token} />
            </CardContent>
          </Card>
        ) : (
          <Card padding="lg">
            <SectionHeader
              size="sm"
              title="Link invalid or expired"
              subtitle="This reset link has already been used or has expired."
              action={<Badge variant="error">Expired</Badge>}
            />
            <CardContent>
              <p className="text-sm text-text-muted">
                Ask the pool admin for a fresh reset link. For security, reset
                links are single-use and only work for a limited time.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
