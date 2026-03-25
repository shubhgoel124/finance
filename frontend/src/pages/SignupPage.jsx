import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/useAuth";
import AuthShell from "../components/AuthShell";
import { getApiErrorMessage } from "../utils/apiError";

function SignupPage() {
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
      const { data } = await api.post("/auth/signup", form);
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Signup failed. Please try a different email."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Start building healthy financial habits today."
      ctaText="Already have an account?"
      ctaHref="/login"
      ctaLabel="Log in"
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
            minLength={6}
            autoComplete="new-password"
            placeholder="Min. 6 characters"
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
          disabled={loading || !form.email || form.password.length < 6}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </AuthShell>
  );
}

export default SignupPage;
