import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Point = { lat: number; lon: number; label: string };

async function geocode(query: string): Promise<Point> {
  const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "br" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "AMEVision/5.0 (contato@alvesmobilidade.com.br)",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Accept: "application/json"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Não foi possível localizar o endereço (${response.status}).`);
  const result = await response.json();
  if (!Array.isArray(result) || !result[0]) throw new Error(`Endereço não encontrado: ${query}`);
  return { lat: Number(result[0].lat), lon: Number(result[0].lon), label: String(result[0].display_name || query) };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const originText = String(params.get("origin") || "").trim();
    const destinationText = String(params.get("destination") || "").trim();
    const currentLat = Number(params.get("currentLat"));
    const currentLon = Number(params.get("currentLon"));

    if (!destinationText) return NextResponse.json({ error: "Informe o endereço de destino." }, { status: 400 });

    const destination = await geocode(destinationText);
    const origin = Number.isFinite(currentLat) && Number.isFinite(currentLon)
      ? { lat: currentLat, lon: currentLon, label: originText || "Localização atual do veículo" }
      : originText
        ? await geocode(originText)
        : null;

    if (!origin) return NextResponse.json({ error: "Informe a origem ou permita o GPS do tablet." }, { status: 400 });

    const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false&alternatives=false`;
    const routeResponse = await fetch(routeUrl, {
      headers: { "User-Agent": "AMEVision/5.0 (contato@alvesmobilidade.com.br)", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });
    if (!routeResponse.ok) throw new Error(`Não foi possível calcular a rota (${routeResponse.status}).`);
    const routeData = await routeResponse.json();
    const route = routeData?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) throw new Error("Nenhuma rota rodoviária foi encontrada.");

    return NextResponse.json({
      origin,
      destination,
      distanceMeters: Number(route.distance || 0),
      durationSeconds: Number(route.duration || 0),
      coordinates: route.geometry.coordinates
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível calcular a rota.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
