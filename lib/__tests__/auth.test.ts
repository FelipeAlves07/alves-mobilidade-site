import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSignInWithPassword, mockSignOut, mockGetSession, mockRpc } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockGetSession: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getSession: mockGetSession,
    },
    rpc: mockRpc,
  },
}));

import { signIn, signOut, restoreSession } from "@/services/auth";

describe("Auth — SECURITY", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("allows admin user (is_admin returns true)", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "u1", email: "admin@test.com", user_metadata: { name: "Admin" } } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await signIn("admin@test.com", "senha123");

      expect(result.logged).toBe(true);
      expect(result.user?.email).toBe("admin@test.com");
      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "admin@test.com", password: "senha123" });
      expect(mockRpc).toHaveBeenCalledWith("is_admin");
    });

    it("rejects non-admin user and signs out", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "u-normal", email: "user@test.com", user_metadata: {} } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: false, error: null });
      mockSignOut.mockResolvedValue(undefined);

      await expect(signIn("user@test.com", "senha")).rejects.toThrow("Acesso não autorizado");
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("rejects when admin check returns error", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "u1", email: "admin@test.com", user_metadata: {} } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
      mockSignOut.mockResolvedValue(undefined);

      await expect(signIn("admin@test.com", "senha")).rejects.toThrow("Acesso não autorizado");
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("throws on invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      });

      await expect(signIn("bad@test.com", "wrong")).rejects.toThrow("Email ou senha incorretos.");
    });

    it("throws on user not found", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "User not found" },
      });

      await expect(signIn("noone@test.com", "x")).rejects.toThrow("cadastrado");
    });

    it("throws on unconfirmed email", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Email not confirmed" },
      });

      await expect(signIn("unconfirmed@test.com", "x")).rejects.toThrow("não confirmado");
    });

    it("does NOT set ame-admin-auth in localStorage", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "u1", email: "admin@test.com", user_metadata: {} } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: true, error: null });

      await signIn("admin@test.com", "senha");

      expect(localStorage.getItem("ame-admin-auth")).toBeNull();
    });
  });

  describe("restoreSession", () => {
    it("returns auth state when valid session + admin", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "u1", email: "admin@test.com", user_metadata: { name: "Admin" } } } },
      });
      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await restoreSession();

      expect(result?.logged).toBe(true);
      expect(result?.user?.email).toBe("admin@test.com");
    });

    it("returns null when no session", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const result = await restoreSession();

      expect(result).toBeNull();
    });

    it("returns null and signs out for non-admin user", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "u-notadmin", email: "user@test.com", user_metadata: {} } } },
      });
      mockRpc.mockResolvedValue({ data: false, error: null });
      mockSignOut.mockResolvedValue(undefined);

      const result = await restoreSession();

      expect(result).toBeNull();
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("returns null and signs out when admin check errors", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "u1", email: "admin@test.com", user_metadata: {} } } },
      });
      mockRpc.mockResolvedValue({ data: null, error: { message: "db error" } });
      mockSignOut.mockResolvedValue(undefined);

      const result = await restoreSession();

      expect(result).toBeNull();
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("does NOT set ame-admin-auth in localStorage", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "u1", email: "admin@test.com", user_metadata: {} } } },
      });
      mockRpc.mockResolvedValue({ data: true, error: null });

      await restoreSession();

      expect(localStorage.getItem("ame-admin-auth")).toBeNull();
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut", async () => {
      mockSignOut.mockResolvedValue(undefined);

      await signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it("does NOT touch localStorage ame-admin-auth", async () => {
      mockSignOut.mockResolvedValue(undefined);

      await signOut();

      expect(localStorage.getItem("ame-admin-auth")).toBeNull();
    });
  });

  describe("NO localStorage bypass", () => {
    it("ame-admin-auth is never written by any auth function", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "u1", email: "admin@test.com", user_metadata: {} } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: true, error: null });
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "u1", email: "admin@test.com", user_metadata: {} } } },
      });
      mockSignOut.mockResolvedValue(undefined);

      await signIn("admin@test.com", "senha");
      expect(localStorage.getItem("ame-admin-auth")).toBeNull();

      await restoreSession();
      expect(localStorage.getItem("ame-admin-auth")).toBeNull();

      await signOut();
      expect(localStorage.getItem("ame-admin-auth")).toBeNull();
    });

    it("checkLocalAuth does not exist as export", async () => {
      const authModule = await import("@/services/auth");
      expect((authModule as Record<string, unknown>).checkLocalAuth).toBeUndefined();
    });
  });
});
