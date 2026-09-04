"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { resolveFormatter, CHART_PALETTE } from "./formatters";

/**
 * data: [{ name: "Website", value: 240 }, ...]
 * format: "number" | "currency" | "percent" (default "number")
 */
export default function DonutChart({ data, format = "number" }) {
  const valueFormatter = resolveFormatter(format);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [valueFormatter(value), name]}
          contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
