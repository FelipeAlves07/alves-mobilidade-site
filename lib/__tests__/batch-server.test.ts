import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, client, createClient } = vi.hoisted(() => {
  const getUser = vi.fn();
  const client = { auth: { getUser } };
  return { getUser, client, createClient: vi.fn(() => client) };
});
const environment = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  operators: process.env.BATCH_OPERATOR_USER_IDS,
};

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import {
  BatchConfigurationError,
  BatchForbiddenError,
  BatchUnauthorizedError,
} from "@/domain/autoprospect/batch";
import { requireBatchServerClient } from "@/lib/batch-server";

function request(authorization?: string): Request {
  return new Request("https://example.test/api/autoprospect/batch", {
    headers: authorization ? { authorization } : {},
  });
}

describe("batch server authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    process.env.BATCH_OPERATOR_USER_IDS = "operator-1, operator-2";
    getUser.mockResolvedValue({ data: { user: { id: "operator-1" } }, error: null });
  });

  afterEach(() => {
    if (environment.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = environment.url;
    if (environment.serviceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = environment.serviceRoleKey;
    if (environment.operators === undefined) delete process.env.BATCH_OPERATOR_USER_IDS;
    else process.env.BATCH_OPERATOR_USER_IDS = environment.operators;
  });

  it("rejects a request without a bearer token", async () => {
    await expect(requireBatchServerClient(request())).rejects.toBeInstanceOf(BatchUnauthorizedError);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects an invalid Supabase session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid token") });
    await expect(requireBatchServerClient(request("Bearer invalid"))).rejects.toBeInstanceOf(BatchUnauthorizedError);
  });

  it("requires an explicit server-side operator allowlist", async () => {
    delete process.env.BATCH_OPERATOR_USER_IDS;
    await expect(requireBatchServerClient(request("Bearer valid"))).rejects.toBeInstanceOf(BatchConfigurationError);
  });

  it("rejects an authenticated user outside the allowlist", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "viewer-1" } }, error: null });
    await expect(requireBatchServerClient(request("Bearer valid"))).rejects.toBeInstanceOf(BatchForbiddenError);
  });

  it("returns the service client only for an allowed authenticated user", async () => {
    await expect(requireBatchServerClient(request("Bearer valid"))).resolves.toBe(client);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-test-key",
      expect.objectContaining({
        auth: expect.objectContaining({ autoRefreshToken: false, persistSession: false }),
      }),
    );
    expect(getUser).toHaveBeenCalledWith("valid");
  });
});
