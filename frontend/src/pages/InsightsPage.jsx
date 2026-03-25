import { useState } from "react";
import dayjs from "dayjs";
import {
  RefreshCw,
  TrendingDown,
  Target,
  Zap,
  AlertCircle,
} from "lucide-react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";

function formatScore(score) {
  return Number(score || 0);
}

function getPriorityColor(priority) {
  if (priority === "High") return "mc-badge-rose";
  if (priority === "Medium") return "mc-badge-amber";
  return "mc-badge-indigo";
}

function InsightsPage() {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadInsights = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/insights", { month });
      setInsight(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to generate insights. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade">
      <PageHeader
        title="Insights"
        subtitle="Actionable guidance based on your monthly spending behavior."
        right={
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mc-input md:w-[160px]"
            />
            <button
              onClick={loadInsights}
              className="mc-btn whitespace-nowrap"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Analyzing..." : "Generate"}
            </button>
          </div>
        }
      />

      {error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--rose-light)] text-[var(--rose)] text-sm animate-slide">
          <AlertCircle size={18} />
          <p className="font-medium">{error}</p>
        </div>
      ) : null}

      {!insight && !loading && !error ? (
        <div className="mc-card p-12 flex flex-col items-center justify-center text-center animate-slide">
          <div className="w-16 h-16 bg-[var(--accent-light)] rounded-full flex items-center justify-center mb-5">
            <Sparkles size={24} className="text-[var(--accent)]" />
          </div>
          <h3 className="text-xl font-bold">Discover Your Spending Patterns</h3>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-sm">
            Click Generate to run an AI-powered analysis of your recent
            transactions and find hidden savings.
          </p>
        </div>
      ) : null}

      {insight ? (
        <div className="space-y-6">
          <section className="mc-card p-6 md:p-8 animate-slide mc-stagger-1 text-center bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-muted)] border-b-0 rounded-b-none">
            <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-[6px] border-[var(--accent)] bg-white shadow-xl shadow-indigo-500/10 mb-6">
              <span className="text-4xl font-black text-[var(--text-primary)] -mt-1">
                {formatScore(insight.financialScore)}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                Score
              </span>
            </div>
            <p className="text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto text-[var(--text-secondary)]">
              "{insight.summary}"
            </p>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide mc-stagger-2 -mt-7 relative z-10 px-4">
            <div className="mc-card p-4 text-center bg-white shadow-sm">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Risk Level
              </p>
              <p className="text-2xl font-bold">
                {insight.diagnostics?.riskLevel || "Low"}
              </p>
            </div>
            <div className="mc-card p-4 text-center bg-white shadow-sm">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                MoM Change
              </p>
              <p className="text-2xl font-bold">
                {insight.diagnostics?.monthOverMonthPct || 0}%
              </p>
            </div>
            <div className="mc-card p-4 text-center bg-white shadow-sm">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Projected
              </p>
              <p className="text-2xl font-bold leading-tight truncate">
                ₹{Number(insight.prediction).toFixed(0)}
              </p>
            </div>
            <div className="mc-card p-4 text-center bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden text-emerald-900 border">
              <p className="text-xs uppercase tracking-wider text-emerald-600/80 mb-1 z-10 relative">
                Savings Target
              </p>
              <p className="text-2xl font-bold z-10 relative leading-tight truncate">
                ₹{Number(insight.totalSavingsOpportunity || 0).toFixed(0)}
              </p>
              <TrendingDown
                size={32}
                className="absolute -bottom-2 -right-2 text-emerald-500/10 z-0"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide mc-stagger-3">
            <section className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Target size={18} className="text-[var(--accent)]" />
                Action Plan
              </h3>

              <div className="space-y-3">
                {(insight.prioritizedActions || []).map((action, idx) => (
                  <div
                    key={`${action.title}-${idx}`}
                    className="mc-card p-5 group hover:border-[var(--accent-border)] hover:bg-[var(--accent-light)] transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-base mb-1 group-hover:text-[var(--accent)] transition-colors">
                          {action.title}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {action.reason}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-bold text-emerald-600">
                          Save ~₹
                          {Number(action.estimatedMonthlySavings || 0).toFixed(
                            0,
                          )}
                          /mo
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`${getPriorityColor(action.priority)} mc-badge`}
                          >
                            {action.priority || "Medium"} Priority
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {(!insight.prioritizedActions ||
                  insight.prioritizedActions.length === 0) && (
                  <p className="text-sm text-[var(--text-muted)] p-5 border border-dashed rounded-xl">
                    No immediate actions needed.
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <AlertCircle size={18} className="text-rose-500" />
                  Risk Factors
                </h3>
                <ul className="space-y-3">
                  {insight.wastefulPatterns.map((item, idx) => (
                    <li
                      key={idx}
                      className="mc-card p-4 text-sm text-[var(--text-secondary)] flex items-start gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                  {insight.wastefulPatterns.length === 0 && (
                    <li className="text-sm text-[var(--text-muted)] italic">
                      No major risks detected.
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Zap size={18} className="text-amber-500" />
                  Quick Tips
                </h3>
                <ul className="space-y-3">
                  {insight.suggestions.map((item, idx) => (
                    <li
                      key={idx}
                      className="mc-card p-4 text-sm text-[var(--text-secondary)] flex items-start gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
import { Sparkles } from "lucide-react";
export default InsightsPage;
