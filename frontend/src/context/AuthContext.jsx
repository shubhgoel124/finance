import { useMemo, useState } from "react";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("finance_token") || "",
  );
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("finance_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = (nextToken, nextUser) => {
    localStorage.setItem("finance_token", nextToken);
    localStorage.setItem("finance_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem("finance_token");
    localStorage.removeItem("finance_user");
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
