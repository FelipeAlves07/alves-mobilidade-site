"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCompanySettings } from "@/domain/company/repository";
import type { CompanySettings } from "@/domain/company/types";

const FALLBACK: CompanySettings = {
  id: "",
  company_name: "Alves Mobilidade Executiva",
  logo_url: null,
  primary_color: "#0c2340",
  secondary_color: "#1a3a6b",
  accent_color: "#2d6da8",
  whatsapp_number: "5531998458084",
  email: null,
  website: null,
  address: null,
  default_language: "pt-BR",
  is_active: true,
  created_at: "",
  updated_at: null,
};

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

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "45, 109, 168";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function applyBrandColors(settings: CompanySettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", settings.primary_color);
  root.style.setProperty("--secondary", settings.secondary_color);
  root.style.setProperty("--accent", settings.accent_color);

  const accentRgb = hexToRgb(settings.accent_color);
  const primaryRgb = hexToRgb(settings.primary_color);
  const secondaryRgb = hexToRgb(settings.secondary_color);

  root.style.setProperty("--accent-rgb", accentRgb);
  root.style.setProperty("--primary-rgb", primaryRgb);
  root.style.setProperty("--secondary-rgb", secondaryRgb);

  root.style.setProperty("--accent-6", `rgba(${accentRgb}, 0.06)`);
  root.style.setProperty("--accent-8", `rgba(${accentRgb}, 0.08)`);
  root.style.setProperty("--accent-10", `rgba(${accentRgb}, 0.10)`);
  root.style.setProperty("--accent-12", `rgba(${accentRgb}, 0.12)`);
  root.style.setProperty("--accent-15", `rgba(${accentRgb}, 0.15)`);
  root.style.setProperty("--accent-18", `rgba(${accentRgb}, 0.18)`);
  root.style.setProperty("--accent-20", `rgba(${accentRgb}, 0.20)`);
  root.style.setProperty("--accent-25", `rgba(${accentRgb}, 0.25)`);
  root.style.setProperty("--accent-35", `rgba(${accentRgb}, 0.35)`);
  root.style.setProperty("--accent-40", `rgba(${accentRgb}, 0.40)`);
  root.style.setProperty("--accent-50", `rgba(${accentRgb}, 0.50)`);
  root.style.setProperty("--accent-60", `rgba(${accentRgb}, 0.60)`);
  root.style.setProperty("--primary-10", `rgba(${primaryRgb}, 0.10)`);
  root.style.setProperty("--primary-15", `rgba(${primaryRgb}, 0.15)`);
  root.style.setProperty("--secondary-10", `rgba(${secondaryRgb}, 0.10)`);
  root.style.setProperty("--secondary-15", `rgba(${secondaryRgb}, 0.15)`);
  root.style.setProperty("--secondary-30", `rgba(${secondaryRgb}, 0.30)`);
}

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

type ThemeContextValue = {
  settings: CompanySettings;
  loaded: boolean;
  mode: "dark" | "light";
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  settings: FALLBACK,
  loaded: false,
  mode: "dark",
  toggleMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ame-theme-mode") as "dark" | "light" | null;
    const initial = saved || "dark";
    setMode(initial);
    applyMode(initial);
  }, []);

  useEffect(() => {
    fetchCompanySettings().then((result) => {
      const s = result ?? FALLBACK;
      setSettings(s);
      applyBrandColors(s);
      setLoaded(true);
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("ame-theme-mode", next);
      applyMode(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ settings, loaded, mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
