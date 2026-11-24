// Demo or live (GO-4). The test link runs as a demonstration: a demo banner, one-click demo logins, the Demo Center.
// Setting APP_MODE=live switches all of that off for go-live (the sample data itself is removed with
// `npm run golive:cleanup`). It is read on the server only; client components receive it as props.
export function isLiveMode() {
  return String(process.env.APP_MODE || "").toLowerCase() === "live";
}

/** What the welcome tour tells a new user about delivery: "demo", "services" (live but still simulated) or null. */
export function deliveryNotice() {
  if (!isLiveMode()) return "demo";
  const simulated = (process.env.EMAIL_PROVIDER || "simulated").toLowerCase() === "simulated" || (process.env.WHATSAPP_PROVIDER || "simulated").toLowerCase() === "simulated";
  return simulated ? "services" : null;
}
