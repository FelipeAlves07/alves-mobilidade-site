import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";

export const dynamic = "force-dynamic";

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a === 0;
}

function allowedRemoteUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return null;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname === "0.0.0.0") return null;
    if (isIP(hostname) === 4 && isPrivateIpv4(hostname)) return null;
    if (isIP(hostname) === 6 && (hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80"))) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") || "";
  const url = allowedRemoteUrl(raw);
  if (!url) return new NextResponse("Imagem inválida", { status: 400 });

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: `${url.protocol}//${url.host}/`,
      },
      cache: "force-cache",
    });

    if (!response.ok) return new NextResponse("Imagem indisponível", { status: 404 });
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
    if (!contentType.startsWith("image/") || contentType === "image/svg+xml") {
      return new NextResponse("Conteúdo não é uma imagem", { status: 415 });
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 10_000_000) return new NextResponse("Imagem muito grande", { status: 413 });

    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 10_000_000) {
      return new NextResponse("Imagem inválida", { status: 413 });
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Falha ao carregar imagem", { status: 502 });
  }
}
