export function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  const saved = localStorage.getItem(key);

  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export function saveLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocal(key: string) {
  if (typeof window === "undefined") return;

  localStorage.removeItem(key);
}