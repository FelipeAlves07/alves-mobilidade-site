export function openWaze(destination: string) {
  if (typeof window === "undefined") return;

  window.open(
    `https://www.waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`,
    "_blank"
  );
}