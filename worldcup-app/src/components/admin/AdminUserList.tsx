"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminGenerateResetToken } from "@/lib/actions/admin";

interface UserRow {
  id: number;
  username: string;
}

interface Props {
  users: UserRow[];
  /**
   * Base URL (no trailing slash) used to build the share link shown to the
   * admin. In prod this is https://worldcup.chris.planow.com; during local
   * dev anything works — admin copies from what they see.
   */
  baseUrl: string;
}

export function AdminUserList({ users, baseUrl }: Props) {
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [pendingUser, setPendingUser] = useState<UserRow | null>(null);
  const [activeLink, setActiveLink] = useState<{
    userId: number;
    url: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState("");

  async function performReset(user: UserRow) {
    setError("");
    setBusyUserId(user.id);
    try {
      const result = await adminGenerateResetToken(user.id);
      if (result.success) {
        setActiveLink({
          userId: user.id,
          url: `${baseUrl}/forgot-password/${result.data.token}`,
          expiresAt: result.data.expiresAt,
        });
      } else {
        setError(result.error);
      }
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <p className="font-display text-sm font-semibold text-text">
          Users
        </p>
        <Badge variant="default">{users.length}</Badge>
      </div>

      <ul className="divide-y divide-border">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text">
                {user.username}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Pool member
              </p>
            </div>
            <Button
              onClick={() => setPendingUser(user)}
              disabled={busyUserId === user.id}
              variant="destructive"
              size="sm"
            >
              {busyUserId === user.id ? "Generating..." : "Reset password"}
            </Button>
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-text-muted">
            No users yet.
          </li>
        )}
      </ul>

      {error && (
        <p className="border-t border-error/30 bg-error-bg px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {activeLink && (
        <div className="border-t border-warning/30 bg-warning-bg px-4 py-3">
          <p className="text-xs font-semibold text-warning">
            Copy this link and send it to the user. It expires at{" "}
            {new Date(activeLink.expiresAt).toLocaleString()}. You won&apos;t be
            able to see it again.
          </p>
          <Input
            readOnly
            value={activeLink.url}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 font-mono text-xs"
            aria-label="Password reset link"
          />
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              onClick={() => setActiveLink(null)}
              variant="ghost"
              size="sm"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingUser !== null}
        onOpenChange={(open) => !open && setPendingUser(null)}
        title="Generate password reset link?"
        description={
          pendingUser
            ? `A one-time link for ${pendingUser.username} will be created. It expires in 1 hour and you won't be able to see it again after this dialog closes.`
            : ""
        }
        confirmLabel="Generate link"
        destructive
        loading={busyUserId === pendingUser?.id}
        onConfirm={async () => {
          if (pendingUser) {
            await performReset(pendingUser);
            setPendingUser(null);
          }
        }}
      />
    </div>
  );
}
