import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, adminHeaders } from "@/lib/api-auth";
import { fetchRouteServer } from "@/lib/route-service-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth as NextResponse;

  const body = await request.json().catch(() => null);
  const origin = typeof body?.origin === "string" ? body.origin : "";
  const destination = typeof body?.destination === "string" ? body.destination : "";

  if (!origin || !destination) {
    return NextResponse.json({ error: "Origem e destino são obrigatórios." }, { status: 400 });
  }

  const route = await fetchRouteServer(origin, destination);
  if (!route) {
    return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
  }

  return NextResponse.json(route, {
    headers: adminHeaders,
  });
}
