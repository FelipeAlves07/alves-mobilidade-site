export function splitRoute(route: string) {
  const parts = route
    .split(/→|->| até | ate | para | pra /i)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    origin: parts[0] || "Belo Horizonte - MG",
    destination: parts[1] || route || "Aeroporto Internacional de Confins",
  };
}

export function openGoogleMapsRoute(origin: string, destination: string) {
  if (typeof window === "undefined") return;

  window.open(
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}&travelmode=driving`,
    "_blank"
  );
}

export function openWazeRoute(destination: string) {
  if (typeof window === "undefined") return;

  window.open(
    `https://www.waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`,
    "_blank"
  );
}