export const SHORT_PROGRAM_SCHEDULE = [
  "welcome", "news", "destinations", "fleet", "referral", "contact", "live-map",
  "news", "weather", "comfort", "contact", "trip", "reviews"
];

export const LONG_PROGRAM_SCHEDULE = [
  "welcome", "news", "destinations", "fleet", "referral", "contact", "live-map",
  "rest",
  "news", "weather", "destinations", "fleet", "news", "reviews", "contact", "trip", "pause-one",
  "rest",
  "news", "weather", "comfort", "referral", "contact", "live-map", "pause-two"
];

export function getSchedule(mode = "long") {
  return mode === "short" ? SHORT_PROGRAM_SCHEDULE : LONG_PROGRAM_SCHEDULE;
}
