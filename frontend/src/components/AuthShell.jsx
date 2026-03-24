import { Link } from "react-router-dom";
import { Sparkles, Target, Compass } from "lucide-react";

function AuthShell({
  title,
  subtitle,
  ctaText,
  ctaHref,
  ctaLabel,
  children,
  error
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[var(--bg-base)]">
      {/* Left panel - Brand & Value prop */}
      <section className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 relative overflow-hidden text-white">
        {/* Decorative mesh gradient */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/20 blur-[120px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Compass size={18} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-wide">Money Compass</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl leading-tight font-bold tracking-tight">
            Financial clarity<br />for modern life.
          </h1>
          <p className="mt-5 text-lg text-slate-300 max-w-md leading-relaxed">
            Track expenses instinctively, understand your patterns instantly, and get actionable coaching that helps you spend with intention.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-transform hover:-translate-y-1">
            <Sparkles size={20} className="text-indigo-400 mb-3" />
            <p className="text-sm font-semibold text-white">Behavior Insights</p>
            <p className="text-xs text-slate-400 mt-1">Smart categorization & anomaly detection</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-transform hover:-translate-y-1">
            <Target size={20} className="text-emerald-400 mb-3" />
            <p className="text-sm font-semibold text-white">Active Planning</p>
            <p className="text-xs text-slate-400 mt-1">Automated budget tracking & savings goals</p>
          </div>
        </div>
      </section>

      {/* Right panel - Form */}
      <section className="flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-md animate-fade">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Compass size={18} className="text-white" />
            </div>
            <span className="text-font font-bold">Money Compass</span>
          </div>

          <div className="mc-card p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{subtitle}</p>

            <div className="mt-8 mb-6">{children}</div>

            {error ? (
              <div className="mb-6 rounded-lg bg-[var(--rose-light)] border border-[var(--rose-border)] px-4 py-3 text-sm text-[var(--rose)] animate-slide flex items-start gap-2">
                <span className="mt-0.5 mt-0 text-lg leading-none">&times;</span>
                <p>{error}</p>
              </div>
            ) : null}

            <p className="text-sm text-[var(--text-secondary)] text-center">
              {ctaText}{" "}
              <Link className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors" to={ctaHref}>
                {ctaLabel}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AuthShell;
