export function openGoogleMaps(origin: string, destination: string) {
  if (typeof window === "undefined") return;

  window.open(
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}&travelmode=driving`,
    "_blank"
  );
}

export function openGoogleMapsSearch(query: string) {
  if (typeof window === "undefined") return;

  window.open(
    `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
    "_blank"
  );
}