import "server-only";

// Small in-memory limiter (per server instance). It is a safety net against a runaway or abusive
// caller of the public form endpoints, not a replacement for a firewall.
const buckets = new Map();

export function rateLimit(key, { limit = 60, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.reset) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now >= v.reset) buckets.delete(k);
  }
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.reset - now) / 1000) };
}
