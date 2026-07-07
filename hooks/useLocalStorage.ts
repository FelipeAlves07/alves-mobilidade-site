"use client";

import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved));
    } catch {
      setValue(initialValue);
    }
  }, [key, initialValue]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage indisponível
    }
  }, [key, value]);

  return [value, setValue] as const;
}