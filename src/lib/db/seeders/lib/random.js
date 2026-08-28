"use strict";

// Small deterministic PRNG (mulberry32) so re-running the seed on a fresh
// database always produces the same demo dataset - useful for reviewing
// diffs and for support/screenshots staying stable across environments.
function createRng(seed = 42) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickWeighted(rng, entries) {
  // entries: [{ value, weight }]
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let r = rng() * total;
  for (const entry of entries) {
    r -= entry.weight;
    if (r <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

function intBetween(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function dateWithinDays(rng, daysAgoMax, daysAgoMin = 0) {
  const now = Date.now();
  const days = intBetween(rng, daysAgoMin, daysAgoMax);
  const ms = days * 24 * 60 * 60 * 1000;
  const jitter = intBetween(rng, 0, 23 * 60 * 60 * 1000);
  return new Date(now - ms - jitter);
}

module.exports = { createRng, pick, pickWeighted, intBetween, dateWithinDays };
