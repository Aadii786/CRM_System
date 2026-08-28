"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { resolveFormatter } from "./formatters";

const COLORS = ["var(--color-primary)", "var(--color-success)", "var(--color-warning)"];

/**
 * data: [{ label: "Contacts", Marketing: 58000, "IKL/HSM": 4280 }, ...]
 * format: "number" | "currency" | "percent" (default "number")
 */
export default function ComparisonBarChart({ data, series, format = "number" }) {
  const valueFormatter = resolveFormatter(format);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          formatter={(value, name) => [valueFormatter(value), name]}
          contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13 }}
          cursor={{ fill: "var(--color-surface-alt)" }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
