"use client";

import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

type AuthView = "login" | "register";

export function AuthContainer() {
  const [view, setView] = useState<AuthView>("login");

  if (view === "register") {
    return <RegisterForm onSwitchToLogin={() => setView("login")} />;
  }

  return <LoginForm onSwitchToRegister={() => setView("register")} />;
}
