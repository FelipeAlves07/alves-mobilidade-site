import { APP_CONFIG } from "../config.js";
import { demoNews, demoTrip, reviews } from "../data/content.js";

async function request(endpoint, fallback) {
  if (!APP_CONFIG.integration.enabled) return fallback;
  try {
    const response = await fetch(`${APP_CONFIG.integration.baseUrl}${endpoint}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) && data.length === 0 ? fallback : data;
  } catch (error) {
    console.warn("[AME Vision] API indisponível; usando conteúdo local.", error);
    return fallback;
  }
}

export const ameApi = {
  getTrip: () => request(APP_CONFIG.integration.endpoints.trip, demoTrip),
  getWeather: () => request(APP_CONFIG.integration.endpoints.weather, {
    city: APP_CONFIG.city, condition: "Parcialmente nublado", icon: "⛅",
    temperature: 24, feelsLike: 25, humidity: 58, wind: "12 km/h",
    forecast: [{ label: "Agora", value: "24°" }, { label: "+1h", value: "25°" }, { label: "+2h", value: "24°" }, { label: "Noite", value: "20°" }]
  }),
  getNews: () => request(APP_CONFIG.integration.endpoints.news, demoNews),
  getReviews: () => request(APP_CONFIG.integration.endpoints.reviews, reviews)
};
