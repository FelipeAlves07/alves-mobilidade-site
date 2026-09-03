const TOLL_API_BASE = "https://www.calcularpedagio.com.br/api";
const TOLL_API_KEY = process.env.NEXT_PUBLIC_TOLL_API_KEY || "";

export interface TollPlaza {
  name: string;
  highway: string;
  cost: number;
  state: string;
}

export interface TollResult {
  totalCost: number;
  plazas: TollPlaza[];
  source: "api" | "manual";
}

const KNOWN_TOLLS: Record<string, number> = {
  "BH -> Confins": 0,
  "confins -> BH": 0,
  "BH -> Aeroporto": 0,
  "Aeroporto -> BH": 0,
  "BH -> SP": 120,
  "SP -> BH": 120,
  "BH -> RJ": 200,
  "RJ -> BH": 200,
  "BH -> Curitiba": 180,
  "Curitiba -> BH": 180,
  "BH -> Brasilia": 100,
  "Brasilia -> BH": 100,
  "BH -> Vitoria": 150,
  "Vitoria -> BH": 150,
};

export async function fetchTolls(
  origin: string,
  destination: string,
  lat?: number,
  lon?: number,
  destLat?: number,
  destLon?: number
): Promise<TollResult> {
  if (TOLL_API_KEY && lat && lon && destLat && destLon) {
    try {
      const res = await fetch(`${TOLL_API_BASE}/coordenadas/v3`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOLL_API_KEY}`,
        },
        body: JSON.stringify({
          pontos: [
            [lat, lon],
            [destLat, destLon],
          ],
        }),
      });
      const data = await res.json();
      if (data.status === "OK" && data.dados?.custoTotalPedagiosDinheiro?.auto2eixos != null) {
        const plazas: TollPlaza[] = (data.dados.pedagiosRota || []).map((p: any) => ({
          name: p.nome || p.localidade || "Pedágio",
          highway: p.nomeRodovia || p.rodovia || "",
          cost: p.custosDinheiro?.auto2eixos || 0,
          state: p.estado || "",
        }));
        return {
          totalCost: data.dados.custoTotalPedagiosDinheiro.auto2eixos,
          plazas,
          source: "api",
        };
      }
    } catch {
      // fallback below
    }
  }

  const key = Object.keys(KNOWN_TOLLS).find((k) => {
    const [o, d] = k.split(" -> ").map((s) => s.toLowerCase());
    return (
      origin.toLowerCase().includes(o) &&
      destination.toLowerCase().includes(d)
    );
  });

  return {
    totalCost: key ? KNOWN_TOLLS[key] : 0,
    plazas: [],
    source: "manual",
  };
}

export function estimateTollsByKm(distanceKm: number): number {
  if (distanceKm < 50) return 0;
  if (distanceKm < 150) return 30;
  if (distanceKm < 300) return 80;
  if (distanceKm < 500) return 140;
  if (distanceKm < 800) return 200;
  return Math.round(distanceKm * 0.25);
}
