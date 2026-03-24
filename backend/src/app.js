const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const insightRoutes = require("./routes/insightRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

const configuredOrigins = String(env.clientUrl || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localhostDevOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const allowOrigins = new Set([...configuredOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowOrigins.has(origin) || localhostDevOriginRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);
app.use("/", transactionRoutes);
app.use("/", budgetRoutes);
app.use("/", insightRoutes);
app.use("/", dashboardRoutes);

app.use(errorHandler);

module.exports = app;
