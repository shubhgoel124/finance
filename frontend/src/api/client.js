import axios from "axios";

function resolveBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return window.location.origin;
  }

  return "http://localhost:5001";
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 120000),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("finance_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
