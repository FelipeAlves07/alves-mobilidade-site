// vitest setup file - runs before all tests
import { vi } from "vitest";

// Module-level store that persists
const localStorageStore: Record<string, string> = {};

// Create the mock object with proper function implementations
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
  get length() { return Object.keys(localStorageStore).length; },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
};

// Define on global and globalThis
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock window so typeof window !== "undefined" checks pass in Node env
// Must NOT be globalThis (circular ref breaks vitest fake timers)
const windowMock = { localStorage: localStorageMock };
Object.defineProperty(global, "window", {
  value: windowMock,
  writable: true,
  configurable: true,
});

// Mock matchMedia for components that use it
Object.defineProperty(global, "matchMedia", {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Suppress console.error for expected test failures
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Warning:") || args[0].includes("act(...)")) &&
    process.env.NODE_ENV === "test"
  ) {
    return;
  }
  originalError.apply(console, args);
};