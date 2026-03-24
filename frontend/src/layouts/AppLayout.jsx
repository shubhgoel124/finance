import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/useAuth";
import { LogOut } from "lucide-react";

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Welcome back</p>
            <h2 className="text-lg font-semibold">{user?.email || "Student"}</h2>
          </div>
          <button
            onClick={onLogout}
            className="mc-btn-ghost mc-btn flex items-center gap-2 text-sm"
          >
            <LogOut size={15} />
            Logout
          </button>
        </header>
        <div className="animate-fade">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
