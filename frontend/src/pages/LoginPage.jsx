import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/useAuth";
import AuthShell from "../components/AuthShell";
import { getApiErrorMessage } from "../utils/apiError";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Login failed. Please check your credentials."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue tracking your progress."
      ctaText="Don't have an account?"
      ctaHref="/signup"
      ctaLabel="Sign up"
      error={error}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 ml-1">
            Email Address
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@university.edu"
            className="mc-input w-full"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 ml-1">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="mc-input w-full"
            value={form.password}
            onChange={(e) =>
              setForm((s) => ({ ...s, password: e.target.value }))
            }
            disabled={loading}
          />
        </div>
        <button
          className="mc-btn w-full mt-2"
          disabled={loading || !form.email || !form.password}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}

export default LoginPage;
