"use strict";

// Centralized semantic color catalog (design system requirement: colors
// communicate meaning, never decoration - every screen pulls from this one
// map rather than picking a shade ad hoc). Each tone pairs an icon color
// with a soft background, mirroring the existing Badge.js status palette.
// CommonJS so both server (department color resolution) and client
// components (MetricCard, Badge, Sidebar) can share the exact same map.
const TONES = {
  blue: { icon: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200", dot: "bg-blue-500" }, // Contacts / People
  purple: { icon: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200", dot: "bg-purple-500" }, // Marketing / Leads
  cyan: { icon: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200", dot: "bg-cyan-500" }, // Deals / Opportunities
  teal: { icon: "text-teal-600", bg: "bg-teal-50", ring: "ring-teal-200", dot: "bg-teal-500" }, // Admissions / secondary dept accent
  green: { icon: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500" }, // Success / Revenue
  amber: { icon: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", dot: "bg-amber-500" }, // Pending / Attention
  red: { icon: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", dot: "bg-red-500" }, // Critical / Lost
  indigo: { icon: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-200", dot: "bg-indigo-500" }, // Administration / System
  neutral: { icon: "text-ink-muted", bg: "bg-surface-alt", ring: "ring-border", dot: "bg-ink-muted" },
};

const TONE_KEYS = Object.keys(TONES).filter((k) => k !== "neutral");

// Known departments get a deliberate, spec-assigned color; any department
// created later (Settings > Departments, unlimited per the multi-department
// architecture) still gets a stable, distinct color automatically via the
// hash fallback below - never a code change to onboard department #4, #5...
const DEPARTMENT_TONE_OVERRIDES = {
  marketing: "purple",
  "ikl-hsm": "blue",
  university: "indigo",
};

function hashToTone(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return TONE_KEYS[hash % TONE_KEYS.length];
}

/** Resolves a department key (e.g. "marketing", "ikl-hsm", or any future one) to a tone key from TONES. */
function departmentTone(departmentKey) {
  if (!departmentKey) return "neutral";
  return DEPARTMENT_TONE_OVERRIDES[departmentKey] || hashToTone(departmentKey);
}

/** Tailwind class trio ({icon, bg, ring}) for a tone key - falls back to neutral for an unknown tone. */
function getTone(toneKey) {
  return TONES[toneKey] || TONES.neutral;
}

module.exports = { TONES, departmentTone, getTone };
