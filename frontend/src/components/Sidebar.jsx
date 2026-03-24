import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CircleDollarSign,
  ReceiptText,
  Sparkles,
  MessageSquareText,
  ChartNoAxesCombined,
  Compass,
  HelpCircle
} from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/add-expense", label: "Add Expense", icon: CircleDollarSign },
  { to: "/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/chat", label: "Chat", icon: MessageSquareText },
  { to: "/analytics", label: "Analytics", icon: ChartNoAxesCombined }
];

function Sidebar() {
  return (
    <aside className="w-full md:w-64 lg:w-[260px] md:min-h-screen border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="p-5">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <Compass size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Money Compass</h1>
            <p className="text-[11px] text-[var(--text-muted)]">Smart Finance</p>
          </div>
        </div>

        {/* Nav label */}
        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)] font-medium mb-2 px-3">
          Menu
        </p>

        {/* Nav items */}
        <nav className="space-y-0.5">
          {items.map((item) => {
            const NavIcon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isActive
                      ? "bg-[var(--accent-light)] text-[var(--accent)] font-semibold border-l-[3px] border-[var(--accent)] -ml-[3px]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                  }`
                }
              >
                <NavIcon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Help link */}
        <div className="mt-8 px-3">
          <a
            href="#"
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <HelpCircle size={14} />
            Help & Support
          </a>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
