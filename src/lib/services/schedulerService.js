import "server-only";
import { runDueCampaigns } from "./emailDeliveryService";
import { runDueAutomations } from "./automationEngine";
import { reconcileOverdueTasks } from "./reminderService";

/**
 * Background work: scheduled campaigns, automation waits, overdue tasks + follow-up reminders.
 * A real scheduler should call /api/cron/* (Vercel Cron or any cron service). Hosts without cron
 * (the Railway test link) still work because the signed-in app shell calls runAllDueThrottled(),
 * at most once a minute per server, whenever someone is using the CRM.
 */
let last = 0;
let running = false;
const MIN_GAP_MS = 60_000;

export async function runAllDue({ budgetMs = 15000 } = {}) {
  const out = {};
  for (const [name, fn] of [
    ["tasks", () => reconcileOverdueTasks()],
    ["automations", () => runDueAutomations({ budgetMs })],
    ["campaigns", () => runDueCampaigns({ budgetMs })],
  ]) {
    try {
      out[name] = await fn();
    } catch (err) {
      console.error(`[scheduler] ${name} failed:`, err?.message || err);
      out[name] = { error: String(err?.message || err).slice(0, 200) };
    }
  }
  return out;
}

export async function runAllDueThrottled() {
  if (running || Date.now() - last < MIN_GAP_MS) return null;
  running = true;
  last = Date.now();
  try {
    return await runAllDue({ budgetMs: 8000 });
  } finally {
    running = false;
  }
}
