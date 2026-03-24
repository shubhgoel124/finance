function StatCard({ title, value, hint, tone = "default", icon: Icon, className = "" }) {
  const toneMap = {
    default: { bg: "bg-[var(--accent-light)]", iconBg: "bg-[var(--accent)]", border: "border-[var(--accent-border)]" },
    warning: { bg: "bg-[var(--amber-light)]", iconBg: "bg-[var(--amber)]", border: "border-[var(--amber-border)]" },
    success: { bg: "bg-[var(--emerald-light)]", iconBg: "bg-[var(--emerald)]", border: "border-[var(--emerald-border)]" },
    danger: { bg: "bg-[var(--rose-light)]", iconBg: "bg-[var(--rose)]", border: "border-[var(--rose-border)]" }
  };

  const t = toneMap[tone] || toneMap.default;

  return (
    <div className={`mc-card mc-card-interactive p-4 animate-slide ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium">{title}</p>
        {Icon ? (
          <div className={`w-8 h-8 rounded-lg ${t.iconBg} flex items-center justify-center`}>
            <Icon size={16} className="text-white" />
          </div>
        ) : null}
      </div>
      <p className="text-2xl font-bold mt-2 leading-none">{value}</p>
      {hint ? <p className="text-xs text-[var(--text-muted)] mt-2">{hint}</p> : null}
    </div>
  );
}

export default StatCard;
