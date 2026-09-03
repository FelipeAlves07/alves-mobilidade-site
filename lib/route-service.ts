const ORS_BASE = "https://api.openrouteservice.org";
const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || "";

export interface RouteInfo {
  distanceKm: number;
  durationSec: number;
  durationText: string;
  origin: string;
  destination: string;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m}min`;
}

export async function geocode(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  if (!ORS_KEY) return null;
  try {
    const res = await fetch(
      `${ORS_BASE}/geocode/search?api_key=${ORS_KEY}&text=${encodeURIComponent(query)}&size=1&boundary.country=BR`
    );
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;
    return {
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      label: f.properties?.label || query,
    };
  } catch {
    return null;
  }
}

export async function fetchRoute(origin: string, destination: string): Promise<RouteInfo | null> {
  if (!ORS_KEY) return null;

  const [orig, dest] = await Promise.all([geocode(origin), geocode(destination)]);
  if (!orig || !dest) return null;

  try {
    const res = await fetch(`${ORS_BASE}/v2/directions/driving-car`, {
      method: "POST",
      headers: {
        Authorization: ORS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [orig.lon, orig.lat],
          [dest.lon, dest.lat],
        ],
        units: "km",
      }),
    });
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
      distanceKm: Math.round(route.summary.distance * 10) / 10,
      durationSec: Math.round(route.summary.duration),
      durationText: formatDuration(route.summary.duration),
      origin: orig.label,
      destination: dest.label,
    };
  } catch {
    return null;
  }
}
