import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatNumber } from "@/lib/format";

const COLORS = ["hsl(var(--primary))", "#8bb76b", "#d6e8ac", "#d3a653", "#9baea6"];

export function DistributionChart({ rows, unit = "records" }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return <div className="space-y-4">
    <div className="relative mx-auto h-[170px] w-[170px]">
      {total ? <ResponsiveContainer width="100%" height="100%"><PieChart>
        <Pie data={rows.filter((row) => row.value > 0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={77} paddingAngle={3} stroke="none" isAnimationActive={false}>
          {rows.filter((row) => row.value > 0).map((row) => <Cell key={row.name} fill={COLORS[rows.indexOf(row) % COLORS.length]} />)}
        </Pie>
      </PieChart></ResponsiveContainer> : <div className="absolute inset-2 rounded-full border-[18px] border-muted" />}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="num text-3xl font-semibold">{formatNumber(total)}</span><span className="mt-1 text-[11px] text-muted-foreground">{unit}</span></div>
    </div>
    <dl className="space-y-2.5">{rows.map((row, index) => <div key={row.name} className="flex items-center justify-between gap-3 text-[12px]">
      <dt className="flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />{row.name}</dt>
      <dd className="num font-semibold">{formatNumber(row.value)}</dd>
    </div>)}</dl>
    {!total && <p className="border-t border-border/70 pt-3 text-center text-[11px] text-muted-foreground">No {unit} recorded yet.</p>}
  </div>;
}
