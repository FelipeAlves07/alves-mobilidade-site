"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCompanySettings } from "@/domain/company/repository";
import type { CompanySettings } from "@/domain/company/types";

// ── Azul Navy Luxo fallback ──────────────────────────────────────────────
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

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "45, 109, 168";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function applyTheme(settings: CompanySettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", settings.primary_color);
  root.style.setProperty("--secondary", settings.secondary_color);
  root.style.setProperty("--accent", settings.accent_color);

  const accentRgb = hexToRgb(settings.accent_color);
  root.style.setProperty("--accent-rgb", accentRgb);

  const primaryRgb = hexToRgb(settings.primary_color);
  root.style.setProperty("--primary-rgb", primaryRgb);

  const secondaryRgb = hexToRgb(settings.secondary_color);
  root.style.setProperty("--secondary-rgb", secondaryRgb);

  // Derived opacity variables (avoids Tailwind opacity-modifier limitation with vars)
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

type ThemeContextValue = {
  settings: CompanySettings;
  loaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  settings: FALLBACK,
  loaded: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchCompanySettings().then((result) => {
      const s = result ?? FALLBACK;
      setSettings(s);
      applyTheme(s);
      setLoaded(true);
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ settings, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
