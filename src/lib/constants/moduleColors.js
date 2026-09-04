"use strict";

// Centralized semantic color catalog (design system requirement: colors
// communicate meaning, never decoration - every screen pulls from this one
// map rather than picking a shade ad hoc). Each tone pairs a light-surface
// variant (icon accents on white cards) with a dark-sidebar variant
// (the sidebar's own background is a rich indigo gradient, so its icons/
// active-pills need brighter, higher-contrast colors than the same tone
// on a white card). CommonJS so both server (department color resolution)
// and client components (MetricCard, Badge, Sidebar) can share one map.
const TONES = {
  // Contacts / People / general information
  blue: {
    icon: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200", dot: "bg-blue-500",
    navIcon: "text-blue-300", navActiveBg: "bg-blue-500", navHoverBg: "hover:bg-blue-400/10",
  },
  // Marketing / Leads / Campaigns / audience-building
  purple: {
    icon: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200", dot: "bg-purple-500",
    navIcon: "text-purple-300", navActiveBg: "bg-purple-500", navHoverBg: "hover:bg-purple-400/10",
  },
  // Deals / Opportunities / pipeline
  cyan: {
    icon: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200", dot: "bg-cyan-500",
    navIcon: "text-cyan-300", navActiveBg: "bg-cyan-500", navHoverBg: "hover:bg-cyan-400/10",
  },
  // Admissions / meetings / a department's secondary accent
  teal: {
    icon: "text-teal-600", bg: "bg-teal-50", ring: "ring-teal-200", dot: "bg-teal-500",
    navIcon: "text-teal-300", navActiveBg: "bg-teal-500", navHoverBg: "hover:bg-teal-400/10",
  },
  // Success / Revenue / WhatsApp
  green: {
    icon: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500",
    navIcon: "text-emerald-300", navActiveBg: "bg-emerald-500", navHoverBg: "hover:bg-emerald-400/10",
  },
  // Pending / needs attention / demo & playful accents
  amber: {
    icon: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", dot: "bg-amber-500",
    navIcon: "text-amber-300", navActiveBg: "bg-amber-500", navHoverBg: "hover:bg-amber-400/10",
  },
  // Critical / Lost
  red: {
    icon: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", dot: "bg-red-500",
    navIcon: "text-red-300", navActiveBg: "bg-red-500", navHoverBg: "hover:bg-red-400/10",
  },
  // Administration / System / university-wide scope
  indigo: {
    icon: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-200", dot: "bg-indigo-500",
    navIcon: "text-indigo-300", navActiveBg: "bg-indigo-500", navHoverBg: "hover:bg-indigo-400/10",
  },
  neutral: {
    icon: "text-ink-muted", bg: "bg-surface-alt", ring: "ring-border", dot: "bg-ink-muted",
    navIcon: "text-slate-400", navActiveBg: "bg-slate-600", navHoverBg: "hover:bg-white/5",
  },
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

/** Tailwind class trio for a tone key - falls back to neutral for an unknown tone. */
function getTone(toneKey) {
  return TONES[toneKey] || TONES.neutral;
}

module.exports = { TONES, departmentTone, getTone };
