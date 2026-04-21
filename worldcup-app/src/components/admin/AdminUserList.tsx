"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [activeLink, setActiveLink] = useState<{
    userId: number;
    url: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState("");

  async function handleReset(user: UserRow) {
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
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Users</h3>
      </div>
      <ul className="divide-y divide-slate-100">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <span className="font-medium text-slate-900">{user.username}</span>
            <Button
              onClick={() => handleReset(user)}
              disabled={busyUserId === user.id}
              className="h-8 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              {busyUserId === user.id ? "Generating..." : "Reset password"}
            </Button>
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No users yet.
          </li>
        )}
      </ul>

      {error && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {activeLink && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold text-amber-900">
            Copy this link and send it to the user. It expires at{" "}
            {new Date(activeLink.expiresAt).toLocaleString()}. You won't be
            able to see it again.
          </p>
          <input
            readOnly
            value={activeLink.url}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 w-full rounded border border-amber-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
          />
          <button
            type="button"
            onClick={() => setActiveLink(null)}
            className="mt-2 text-xs text-amber-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
