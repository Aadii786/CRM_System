"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { resolveFormatter } from "./formatters";

const COLORS = ["var(--color-primary)", "var(--color-success)", "var(--color-warning)", "var(--color-info)"];

/**
 * data: [{ label: "Jan", seriesA: 10, seriesB: 20 }, ...]
 * series: [{ key: "seriesA", name: "New Leads" }, ...]
 * format: "number" | "currency" | "percent" (default "number")
 */
export default function TrendLineChart({ data, series, format = "number" }) {
  const valueFormatter = resolveFormatter(format);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          formatter={(value, name) => [valueFormatter(value), name]}
          contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
