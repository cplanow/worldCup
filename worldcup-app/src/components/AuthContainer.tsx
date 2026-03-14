"use client";

import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { SetPasswordForm } from "./SetPasswordForm";

type AuthView = "login" | "register" | "set-password";

export function AuthContainer() {
  const [view, setView] = useState<AuthView>("login");
  const [passwordUsername, setPasswordUsername] = useState("");

  function handleNeedsPassword(username: string) {
    setPasswordUsername(username);
    setView("set-password");
  }

  if (view === "register") {
    return <RegisterForm onSwitchToLogin={() => setView("login")} />;
  }

  if (view === "set-password") {
    return <SetPasswordForm username={passwordUsername} />;
  }

  return (
    <LoginForm
      onSwitchToRegister={() => setView("register")}
      onNeedsPassword={handleNeedsPassword}
    />
  );
}
