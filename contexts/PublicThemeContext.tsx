"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const LIGHT_VARS: Record<string, string> = {
  "--bg-primary": "#f5f5f5",
  "--bg-elevated": "#ffffff",
  "--bg-card": "#ffffff",
  "--bg-card-hover": "#f0f0f0",
  "--bg-surface": "#fafafa",
  "--background": "#f5f5f5",
  "--background-soft": "#ffffff",
  "--background-card": "#ffffff",
  "--foreground": "#1a1a1a",
  "--text-muted": "#666666",
  "--border-subtle": "rgba(0,0,0,0.06)",
  "--border-light": "rgba(0,0,0,0.08)",
  "--border-medium": "rgba(0,0,0,0.12)",
  "--border-strong": "rgba(0,0,0,0.18)",
  "--shadow-card": "0 4px 20px rgba(0,0,0,0.08)",
  "--shadow-card-hover": "0 8px 30px rgba(0,0,0,0.12)",
  "--shadow-glow": "0 0 40px rgba(var(--accent-rgb), 0.06)",
  "--shadow-glow-hover": "0 0 50px rgba(var(--accent-rgb), 0.10)",
};

const DARK_VARS: Record<string, string> = {
  "--bg-primary": "#0a0a0a",
  "--bg-elevated": "#121212",
  "--bg-card": "#1a1a1a",
  "--bg-card-hover": "#222222",
  "--bg-surface": "#181818",
  "--background": "#0a0a0a",
  "--background-soft": "#111111",
  "--background-card": "#1a1a1a",
  "--foreground": "#e8e3dc",
  "--text-muted": "#8a8580",
  "--border-subtle": "rgba(255,255,255,0.06)",
  "--border-light": "rgba(255,255,255,0.08)",
  "--border-medium": "rgba(255,255,255,0.12)",
  "--border-strong": "rgba(255,255,255,0.18)",
  "--shadow-card": "0 8px 30px rgba(0,0,0,0.35)",
  "--shadow-card-hover": "0 12px 40px rgba(0,0,0,0.45)",
  "--shadow-glow": "0 0 40px rgba(var(--accent-rgb), 0.04)",
  "--shadow-glow-hover": "0 0 50px rgba(var(--accent-rgb), 0.08)",
};

function applyMode(mode: "dark" | "light") {
  const root = document.documentElement;
  const vars = mode === "light" ? LIGHT_VARS : DARK_VARS;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.classList.toggle("light-mode", mode === "light");
  root.classList.toggle("dark-mode", mode === "dark");
  root.setAttribute("data-theme", mode);
}

type PublicThemeContextValue = {
  mode: "dark" | "light";
  toggleMode: () => void;
};

const PublicThemeContext = createContext<PublicThemeContextValue>({
  mode: "dark",
  toggleMode: () => {},
});

export function PublicThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ame-theme-mode") as "dark" | "light" | null;
    const initial = saved || "dark";
    setMode(initial);
    applyMode(initial);
    setMounted(true);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("ame-theme-mode", next);
      applyMode(next);
      return next;
    });
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <PublicThemeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </PublicThemeContext.Provider>
  );
}

export function usePublicTheme() {
  return useContext(PublicThemeContext);
}
