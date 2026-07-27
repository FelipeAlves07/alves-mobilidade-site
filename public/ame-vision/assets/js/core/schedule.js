export const SHORT_PROGRAM_SCHEDULE = [
  "welcome", "news", "weather", "destinations", "comfort", "trip",
  "live-map", "news", "fleet", "reviews", "referral", "contact"
];

export const LONG_PROGRAM_SCHEDULE = [
  "welcome", "news", "weather", "destinations", "comfort", "trip", "live-map", "news",
  "rest",
  "news", "weather", "destinations", "fleet", "news", "reviews", "live-map",
  "rest",
  "news", "weather", "comfort", "trip", "referral", "contact", "pause-two"
];

export function getSchedule(mode = "long", gpsEnabled = false) {
  const schedule = mode === "short" ? SHORT_PROGRAM_SCHEDULE : LONG_PROGRAM_SCHEDULE;
  return gpsEnabled ? schedule : schedule.filter(id => id !== "live-map");
}
