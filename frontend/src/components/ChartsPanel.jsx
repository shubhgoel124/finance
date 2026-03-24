import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Area,
  AreaChart,
  CartesianGrid
} from "recharts";

const palette = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="mc-card px-3 py-2 text-xs shadow-lg">
      {label ? <p className="font-medium mb-1">{label}</p> : null}
      {payload.map((item, i) => (
        <p key={i} style={{ color: item.color || item.fill }}>
          {item.name}: ₹{Number(item.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
}

function ChartsPanel({ categoryTotals = {}, dailyTrend = [] }) {
  const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="mc-card rounded-2xl p-5 animate-slide">
        <h3 className="mc-section-title">Category Breakdown</h3>
        <p className="mc-section-subtitle">How your spending is distributed.</p>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                innerRadius={55}
                paddingAngle={3}
                cornerRadius={4}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={palette[index % palette.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mc-card rounded-2xl p-5 animate-slide mc-stagger-1">
        <h3 className="mc-section-title">Daily Spending</h3>
        <p className="mc-section-subtitle">Recent spending rhythm.</p>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend.slice(-14)}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#areaFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ChartsPanel;
