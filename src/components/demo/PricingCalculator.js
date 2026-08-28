"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { formatCurrencyFull } from "@/lib/utils/format";

// Illustrative demo-only cost model (requirements #102-#103). These are NOT
// real Brevo prices - every number here is a rough placeholder rate meant
// to shape the cost conversation, clearly labeled as such throughout.
const SCENARIOS = {
  current: { label: "Current - 58,000 contacts, 6 users", contacts: 58000, users: 6 },
  growth: { label: "Growth - 75,000 contacts, 10 users", contacts: 75000, users: 10 },
  expansion: { label: "Expansion - 100,000 contacts, 20 users", contacts: 100000, users: 20 },
  "university-wide": { label: "University-wide - 150,000+ contacts, 50 users", contacts: 150000, users: 50 },
};

const RATE_PER_1K_CONTACTS = 1800; // PKR / month, illustrative
const RATE_PER_SEAT = 3500; // PKR / month, illustrative
const WHATSAPP_MONTHLY = 15000; // PKR / month, illustrative flat allowance
const AUTOMATION_ADDON = 12000; // PKR / month
const CUSTOM_OBJECTS_ADDON = 8000; // PKR / month
const IMPLEMENTATION_FLAT = 250000; // PKR, one-time
const TRAINING_FLAT = 60000; // PKR, one-time
const SUPPORT_ANNUAL_RATE = 0.18; // % of annual license

export default function PricingCalculator() {
  const [scenarioKey, setScenarioKey] = useState("current");
  const scenario = SCENARIOS[scenarioKey];

  const breakdown = useMemo(() => {
    const contactsCost = (scenario.contacts / 1000) * RATE_PER_1K_CONTACTS;
    const seatsCost = scenario.users * RATE_PER_SEAT;
    const monthly = contactsCost + seatsCost + WHATSAPP_MONTHLY + AUTOMATION_ADDON + CUSTOM_OBJECTS_ADDON;
    const annual = monthly * 12;
    const supportAnnual = annual * SUPPORT_ANNUAL_RATE;

    return {
      contactsCost,
      seatsCost,
      whatsapp: WHATSAPP_MONTHLY,
      automation: AUTOMATION_ADDON,
      customObjects: CUSTOM_OBJECTS_ADDON,
      monthly,
      annual,
      supportAnnual,
      year1: annual + supportAnnual + IMPLEMENTATION_FLAT + TRAINING_FLAT,
      year2: annual + supportAnnual,
      year3: annual + supportAnnual,
    };
  }, [scenario]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="max-w-sm">
        <label className="block text-sm font-medium text-ink mb-1.5">Scenario</label>
        <Select value={scenarioKey} onChange={(e) => setScenarioKey(e.target.value)}>
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </Select>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><p className="text-xs text-ink-muted mb-1">Monthly</p><p className="text-xl font-semibold text-ink">{formatCurrencyFull(breakdown.monthly)}</p></Card>
        <Card><p className="text-xs text-ink-muted mb-1">Annual</p><p className="text-xl font-semibold text-ink">{formatCurrencyFull(breakdown.annual)}</p></Card>
        <Card><p className="text-xs text-ink-muted mb-1">Year 1 (incl. implementation)</p><p className="text-xl font-semibold text-primary-active">{formatCurrencyFull(breakdown.year1)}</p></Card>
      </div>

      <Card padding="none">
        <div className="p-5 pb-2">
          <h3 className="text-sm font-semibold text-ink">Cost Breakdown</h3>
        </div>
        <div className="divide-y divide-border">
          <Row label="Contacts" value={breakdown.contactsCost} note={`${scenario.contacts.toLocaleString()} contacts`} />
          <Row label="Seats" value={breakdown.seatsCost} note={`${scenario.users} users`} />
          <Row label="WhatsApp Credits" value={breakdown.whatsapp} />
          <Row label="Marketing Automation" value={breakdown.automation} />
          <Row label="Custom Objects / Sales CRM" value={breakdown.customObjects} />
          <Row label="Implementation (one-time)" value={IMPLEMENTATION_FLAT} oneTime />
          <Row label="Training (one-time)" value={TRAINING_FLAT} oneTime />
          <Row label="Support (annual, ~18% of license)" value={breakdown.supportAnnual} annual />
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><p className="text-xs text-ink-muted mb-1">Year 1</p><p className="text-lg font-semibold text-ink">{formatCurrencyFull(breakdown.year1)}</p></Card>
        <Card><p className="text-xs text-ink-muted mb-1">Year 2</p><p className="text-lg font-semibold text-ink">{formatCurrencyFull(breakdown.year2)}</p></Card>
        <Card><p className="text-xs text-ink-muted mb-1">Year 3</p><p className="text-lg font-semibold text-ink">{formatCurrencyFull(breakdown.year3)}</p></Card>
      </div>
    </div>
  );
}

function Row({ label, value, note, oneTime, annual }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <div>
        <span className="text-ink-secondary">{label}</span>
        {note && <span className="text-xs text-ink-muted ml-2">({note})</span>}
        {oneTime && <span className="text-xs text-ink-muted ml-2">(one-time)</span>}
        {annual && <span className="text-xs text-ink-muted ml-2">(annual)</span>}
      </div>
      <span className="font-medium text-ink tabular-nums">{formatCurrencyFull(value)}{!oneTime && !annual && " / mo"}</span>
    </div>
  );
}
