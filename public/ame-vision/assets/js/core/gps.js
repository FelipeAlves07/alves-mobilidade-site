let leafletPromise;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.dataset.leaflet = 'true';
      document.head.appendChild(link);
    }
    const existing = document.querySelector('script[data-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.dataset.leaflet = 'true';
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return leafletPromise;
}

function formatSpeed(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.max(0, value * 3.6).toFixed(0)} km/h`;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? ` ${rest}min` : ''}`;
}

function distanceBetween(a, b) {
  const R = 6371000;
  const p1 = a[0] * Math.PI / 180;
  const p2 = b[0] * Math.PI / 180;
  const dp = (b[0] - a[0]) * Math.PI / 180;
  const dl = (b[1] - a[1]) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildRouteMetrics(points) {
  const remaining = new Array(points.length).fill(0);
  for (let index = points.length - 2; index >= 0; index--) remaining[index] = remaining[index + 1] + distanceBetween(points[index], points[index + 1]);
  return remaining;
}

function nearestRouteIndex(points, current) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = distanceBetween(point, current);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  return bestIndex;
}

async function requestRoute(routeSettings, current) {
  const params = new URLSearchParams({
    origin: routeSettings.origin || '',
    destination: routeSettings.destination || '',
    currentLat: String(current[0]),
    currentLon: String(current[1])
  });
  const response = await fetch(`/api/ame-vision/route?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível calcular a rota.');
  return data;
}

window.AME_VISION_GPS = { distance: '—', eta: '—', speed: '—', coords: '', status: 'Aguardando GPS…', destination: '' };

export function initGPSTracker(routeSettings = {}) {
  if (!navigator.geolocation) return () => {};
  window.AME_VISION_GPS.destination = routeSettings.destination || '';
  let stopped = false;
  let routeData = { points: [], remaining: [], distance: 0, duration: 0 };
  let routeRequested = false;

  async function loadRoute(current) {
    if (routeRequested || !routeSettings.destination) return;
    routeRequested = true;
    try {
      const data = await requestRoute(routeSettings, current);
      if (stopped) return;
      routeData.points = data.coordinates.map(([lon, lat]) => [lat, lon]);
      routeData.remaining = buildRouteMetrics(routeData.points);
      routeData.duration = Number(data.durationSeconds || 0);
      routeData.distance = Number(data.distanceMeters || routeData.remaining[0] || 0);
      window.AME_VISION_GPS.distance = formatDistance(routeData.distance);
      window.AME_VISION_GPS.eta = formatDuration(routeData.duration);
      window.AME_VISION_GPS.status = 'Rota ativa';
    } catch { routeRequested = false; }
  }

  const watchId = navigator.geolocation.watchPosition(position => {
    if (stopped) return;
    const { latitude, longitude, speed: metersPerSecond, accuracy } = position.coords;
    const point = [latitude, longitude];
    window.AME_VISION_GPS.speed = formatSpeed(metersPerSecond);
    window.AME_VISION_GPS.coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    if (!window.AME_VISION_GPS._firstFix) {
      window.AME_VISION_GPS._firstFix = true;
      loadRoute(point);
    }
    if (routeData.points.length) {
      const index = nearestRouteIndex(routeData.points, point);
      const remaining = routeData.remaining[index] || 0;
      const fraction = routeData.distance > 0 ? remaining / routeData.distance : 0;
      window.AME_VISION_GPS.distance = formatDistance(remaining);
      window.AME_VISION_GPS.eta = formatDuration(routeData.duration * fraction);
    }
    if (!routeSettings.destination) {
      window.AME_VISION_GPS.status = `GPS ativo · precisão aprox. ${Math.round(accuracy)} m`;
    }
  }, error => {
    const messages = { 1: 'Permissão negada.', 2: 'Indisponível.', 3: 'GPS lento.' };
    window.AME_VISION_GPS.status = messages[error.code] || 'Erro no GPS.';
  }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 });

  return () => { stopped = true; navigator.geolocation.clearWatch(watchId); };
}

export async function startLiveMap(container, routeSettings = {}) {
  const screen = container.closest('.live-map-screen');
  const status = screen?.querySelector('[data-gps-status]');
  const speed = screen?.querySelector('[data-gps-speed]');
  const coords = screen?.querySelector('[data-gps-coords]');
  const remainingValue = screen?.querySelector('[data-route-distance]');
  const etaValue = screen?.querySelector('[data-route-eta]');
  const routeLabel = screen?.querySelector('[data-route-label]');

  if (!navigator.geolocation) {
    if (status) status.textContent = 'Este dispositivo não oferece GPS pelo navegador.';
    return () => {};
  }

  const L = await loadLeaflet();
  const map = L.map(container, { zoomControl: false, attributionControl: true }).setView([-19.9167, -43.9345], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);

  const trail = L.polyline([], { weight: 4, opacity: 0.65 }).addTo(map);
  let routeLine = null;
  let routePoints = [];
  let routeRemaining = [];
  let routeDuration = 0;
  let routeDistance = 0;
  let marker;
  let destinationMarker;
  let firstFix = true;
  let routeRequested = false;
  let stopped = false;

  async function loadRoute(current) {
    if (routeRequested || !routeSettings.destination) return;
    routeRequested = true;
    try {
      if (status) status.textContent = 'Calculando rota rodoviária…';
      const data = await requestRoute(routeSettings, current);
      if (stopped) return;
      routePoints = data.coordinates.map(([lon, lat]) => [lat, lon]);
      routeRemaining = buildRouteMetrics(routePoints);
      routeDuration = Number(data.durationSeconds || 0);
      routeDistance = Number(data.distanceMeters || routeRemaining[0] || 0);
      routeLine = L.polyline(routePoints, { weight: 6, opacity: 0.9 }).addTo(map);
      destinationMarker = L.marker([data.destination.lat, data.destination.lon]).addTo(map).bindPopup('Destino');
      map.fitBounds(routeLine.getBounds(), { padding: [28, 28], maxZoom: 13 });
      window.setTimeout(() => map.setView(current, 13, { animate: true }), 500);
      if (routeLabel) routeLabel.textContent = `${data.origin.label} → ${data.destination.label}`;
      if (remainingValue) remainingValue.textContent = formatDistance(routeDistance);
      if (etaValue) etaValue.textContent = formatDuration(routeDuration);
      if (status) status.textContent = 'Rota ativa · acompanhando o deslocamento em tempo real.';
      window.AME_VISION_GPS.distance = formatDistance(routeDistance);
      window.AME_VISION_GPS.eta = formatDuration(routeDuration);
      window.AME_VISION_GPS.status = 'Rota ativa';
    } catch (error) {
      routeRequested = false;
      if (status) status.textContent = error instanceof Error ? error.message : 'Não foi possível calcular a rota.';
    }
  }

  const watchId = navigator.geolocation.watchPosition(position => {
    if (stopped) return;
    const { latitude, longitude, speed: metersPerSecond, accuracy } = position.coords;
    const point = [latitude, longitude];
    if (!marker) marker = L.circleMarker(point, { radius: 10, weight: 4, fillOpacity: 1 }).addTo(map);
    else marker.setLatLng(point);
    trail.addLatLng(point);

    if (firstFix) {
      map.setView(point, 16);
      firstFix = false;
      loadRoute(point);
    } else if (!routeLine) {
      map.panTo(point, { animate: true, duration: 0.8 });
    } else if (!map.getBounds().pad(-0.28).contains(point)) {
      map.panTo(point, { animate: true, duration: 0.8 });
    }

    if (routePoints.length) {
      const index = nearestRouteIndex(routePoints, point);
      const remaining = routeRemaining[index] || 0;
      const fraction = routeDistance > 0 ? remaining / routeDistance : 0;
      if (remainingValue) remainingValue.textContent = formatDistance(remaining);
      if (etaValue) etaValue.textContent = formatDuration(routeDuration * fraction);
      window.AME_VISION_GPS.distance = formatDistance(remaining);
      window.AME_VISION_GPS.eta = formatDuration(routeDuration * fraction);
    }

    window.AME_VISION_GPS.speed = formatSpeed(metersPerSecond);
    window.AME_VISION_GPS.coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    if (status && !routeSettings.destination) status.textContent = `GPS ativo · precisão aproximada de ${Math.round(accuracy)} m · informe um destino no AME Control para desenhar a rota.`;
    if (speed) speed.textContent = formatSpeed(metersPerSecond);
    if (coords) coords.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }, error => {
    const messages = {
      1: 'Permissão de localização negada. Autorize o GPS para este site no tablet.',
      2: 'Localização indisponível no momento.',
      3: 'O GPS demorou para responder. Tentando novamente…'
    };
    if (status) status.textContent = messages[error.code] || 'Não foi possível acessar o GPS.';
  }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 });

  setTimeout(() => map.invalidateSize(), 250);
  return () => {
    stopped = true;
    navigator.geolocation.clearWatch(watchId);
    if (destinationMarker) destinationMarker.remove();
    map.remove();
  };
}
