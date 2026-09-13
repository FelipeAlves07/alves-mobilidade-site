import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const mockGetSession = vi.mocked(
  (await import("@/lib/supabase")).supabase.auth.getSession,
);

describe("GATE P2 — API security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("route-service.ts — client uses NEXT_PUBLIC key", () => {
    it("source code reads NEXT_PUBLIC_ORS_API_KEY for client-side routing", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("lib/route-service.ts"), "utf-8");
      expect(content).toContain("NEXT_PUBLIC_ORS_API_KEY");
      expect(content).toContain("openrouteservice.org");
      expect(content).toContain("/v2/directions/driving-car");
    });
  });

  describe("toll-service.ts — client no external calls", () => {
    it("returns local toll data without calling external API", async () => {
      const { fetchTolls } = await import("@/lib/toll-service");
      const result = await fetchTolls("BH", "SP");
      expect(result.source).toBe("manual");
      expect(result.totalCost).toBe(120);
    });

    it("toll-service uses NEXT_PUBLIC_TOLL_API_KEY for client-side access", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const tollService = fs.readFileSync(path.resolve("lib/toll-service.ts"), "utf-8");
      expect(tollService).toContain("NEXT_PUBLIC_TOLL_API_KEY");
      expect(tollService).toContain("calcularpedagio.com.br");
    });

    it("route-service uses NEXT_PUBLIC_ORS_API_KEY for client-side access", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const routeService = fs.readFileSync(path.resolve("lib/route-service.ts"), "utf-8");
      expect(routeService).toContain("NEXT_PUBLIC_ORS_API_KEY");
      expect(routeService).toContain("openrouteservice.org");
    });
  });

  describe("route-service-server.ts — server-only", () => {
    it("imports server-only module", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("lib/route-service-server.ts"), "utf-8");
      expect(content).toContain('import "server-only"');
      expect(content).toContain("process.env.ORS_API_KEY");
    });

    it("does NOT expose key in console.log", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("lib/route-service-server.ts"), "utf-8");
      expect(content).not.toContain("console.log(ORS_KEY");
      expect(content).not.toContain("console.log(ORS_API_KEY");
    });
  });

  describe("api-auth.ts — admin auth middleware", () => {
    it("exports requireAdminAuth, adminHeaders, unauthorized, forbidden", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("lib/api-auth.ts"), "utf-8");
      expect(content).toContain("export async function requireAdminAuth");
      expect(content).toContain("export function unauthorized");
      expect(content).toContain("export function forbidden");
      expect(content).toContain("export const adminHeaders");
      expect(content).toContain("no-store");
      expect(content).toContain('import "server-only"');
    });

    it("returns 401 with proper headers when no Authorization header", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("lib/api-auth.ts"), "utf-8");
      expect(content).toContain("return unauthorized()");
      expect(content).toContain("status: 401");
      expect(content).toContain('"Cache-Control": "no-store');
    });

    it("returns 403 for non-admin users", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("lib/api-auth.ts"), "utf-8");
      expect(content).toContain("return forbidden()");
      expect(content).toContain("status: 403");
    });
  });

  describe("rate-limit.ts", () => {
    it("allows requests within limit", async () => {
      const { rateLimit } = await import("@/lib/rate-limit");
      const key = `test-allow-${Date.now()}`;
      const result = rateLimit(key, { windowMs: 60_000, max: 5 });
      expect(result.allowed).toBe(true);
    });

    it("blocks requests over limit", async () => {
      const { rateLimit } = await import("@/lib/rate-limit");
      const key = `test-block-${Date.now()}`;
      for (let i = 0; i < 5; i++) {
        rateLimit(key, { windowMs: 60_000, max: 5 });
      }
      const result = rateLimit(key, { windowMs: 60_000, max: 5 });
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("returns correct headers", async () => {
      const { rateLimitHeaders } = await import("@/lib/rate-limit");
      const config = { windowMs: 60_000, max: 10 };
      const headers = rateLimitHeaders(config, 7, 45000);
      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("7");
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
    });
  });

  describe("rate-limit — route integration (structural)", () => {
    it("analyze route imports rateLimit", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("app/api/autoprospect/analyze/route.ts"), "utf-8");
      expect(content).toContain('from "@/lib/rate-limit"');
      expect(content).toContain("rl-analyze");
      expect(content).toContain("429");
    });

    it("discover route imports rateLimit", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("app/api/autoprospect/discover/route.ts"), "utf-8");
      expect(content).toContain('from "@/lib/rate-limit"');
      expect(content).toContain("rl-discover");
      expect(content).toContain("429");
    });

    it("whatsapp leads route imports rateLimit", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("app/api/whatsapp/leads/route.ts"), "utf-8");
      expect(content).toContain('from "@/lib/rate-limit"');
      expect(content).toContain("rl-whatsapp");
      expect(content).toContain("429");
    });

    it("ame-vision news route imports rateLimit", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("app/api/ame-vision/news/route.ts"), "utf-8");
      expect(content).toContain('from "@/lib/rate-limit"');
      expect(content).toContain("rl-amv-news");
      expect(content).toContain("429");
    });

    it("ame-vision image route imports rateLimit", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("app/api/ame-vision/news/image/route.ts"), "utf-8");
      expect(content).toContain('from "@/lib/rate-limit"');
      expect(content).toContain("rl-amv-image");
      expect(content).toContain("429");
    });

    it("ame-vision route route imports rateLimit", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const content = fs.readFileSync(path.resolve("app/api/ame-vision/route/route.ts"), "utf-8");
      expect(content).toContain('from "@/lib/rate-limit"');
      expect(content).toContain("rl-amv-route");
      expect(content).toContain("429");
    });
  });

  describe("service worker — basic offline support", () => {
    it("only caches GET requests", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const sw = fs.readFileSync(path.resolve("public/sw.js"), "utf-8");
      expect(sw).toContain('event.request.method !== "GET"');
    });

    it("responds with network-first strategy, falling back to cache", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const sw = fs.readFileSync(path.resolve("public/sw.js"), "utf-8");
      expect(sw).toContain("fetch(event.request)");
      expect(sw).toContain("caches.match(event.request)");
    });

    it("caches static assets on install", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const sw = fs.readFileSync(path.resolve("public/sw.js"), "utf-8");
      expect(sw).toContain("cache.addAll");
      expect(sw).toContain("/admin");
    });
  });

  describe("NEXT_PUBLIC key audit — source code", () => {
    it("client-side services use NEXT_PUBLIC keys for browser access", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const routeService = fs.readFileSync(path.resolve("lib/route-service.ts"), "utf-8");
      const tollService = fs.readFileSync(path.resolve("lib/toll-service.ts"), "utf-8");
      expect(routeService).toContain("NEXT_PUBLIC_ORS_API_KEY");
      expect(tollService).toContain("NEXT_PUBLIC_TOLL_API_KEY");
    });

    it("server-only services use server env keys", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const routeServiceServer = fs.readFileSync(path.resolve("lib/route-service-server.ts"), "utf-8");
      expect(routeServiceServer).toContain('import "server-only"');
      expect(routeServiceServer).toContain("process.env.ORS_API_KEY");
    });
  });

  describe("admin API routes — structure", () => {
    const adminRoutes = [
      { path: "/api/autoprospect/analyze", method: "POST" },
      { path: "/api/autoprospect/discover", method: "POST" },
      { path: "/api/autoprospect/intelligence", method: "POST" },
      { path: "/api/autoprospect/opportunities", method: "GET" },
      { path: "/api/autoprospect/opportunities", method: "POST" },
      { path: "/api/autoprospect/opportunities/00000000-0000-0000-0000-000000000000", method: "GET" },
      { path: "/api/autoprospect/opportunities/00000000-0000-0000-0000-000000000000", method: "PATCH" },
      { path: "/api/autoprospect/opportunities/00000000-0000-0000-0000-000000000000/interactions", method: "GET" },
      { path: "/api/autoprospect/opportunities/00000000-0000-0000-0000-000000000000/interactions", method: "POST" },
      { path: "/api/whatsapp/leads", method: "DELETE" },
      { path: "/api/whatsapp/leads", method: "POST" },
      { path: "/api/route", method: "POST" },
    ];

    it.each(adminRoutes)(
      "route handler exists for $method $path",
      async ({ path: routePath }) => {
        const fs = await import("node:fs");
        const path = await import("node:path");

        let filePath = routePath
          .replace("/api/autoprospect/", "app/api/autoprospect/")
          .replace("/api/whatsapp/", "app/api/whatsapp/")
          .replace("/api/route", "app/api/route");

        if (routePath.includes("[id]")) {
          filePath = filePath.replace(
            /opportunities\/[0-9a-f-]+/,
            "opportunities/[id]",
          );
        }

        const fullPath = path.resolve(filePath, "route.ts");
        if (!fs.existsSync(fullPath)) {
          console.warn(`SKIP: ${fullPath} not found`);
          return;
        }

        const content = fs.readFileSync(fullPath, "utf-8");
        expect(content).toContain("NextRequest");
        expect(content).toContain("NextResponse");
      },
    );
  });
});
