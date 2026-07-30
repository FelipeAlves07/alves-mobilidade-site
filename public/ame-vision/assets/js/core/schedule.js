export const SHORT_PROGRAM_SCHEDULE = [
  "welcome", "news", "destinations", "fleet", "referral", "contact",
  "news", "weather", "comfort", "contact", "reviews"
];

export const LONG_PROGRAM_SCHEDULE = [
  "welcome", "news", "destinations", "fleet", "referral", "contact",
  "rest",
  "news", "weather", "destinations", "fleet", "news", "reviews", "contact", "pause-one",
  "rest",
  "news", "weather", "comfort", "referral", "contact", "pause-two"
];

export function getSchedule(mode = "long", universal = false) {
  const schedule = mode === "short" ? SHORT_PROGRAM_SCHEDULE : LONG_PROGRAM_SCHEDULE;
  if (universal) return schedule.filter(id => id !== "live-map" && id !== "trip");
  return schedule;
}
