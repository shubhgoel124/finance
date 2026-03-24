const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envFiles = [
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env.local"),
  path.resolve(__dirname, "../../../.env")
];

for (const envPath of envFiles) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: (process.env.NODE_ENV || "").toLowerCase() === "production",
  port: Number(process.env.PORT || 5001),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/student-finance-ai",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  llmProvider: (process.env.LLM_PROVIDER || "").toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  hfApiKey: process.env.HF_API_KEY || "",
  hfModel: process.env.HF_MODEL || "Qwen/Qwen2.5-72B-Instruct",
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 5),
  pineconeApiKey: process.env.PINECONE_API_KEY || "",
  pineconeIndex: process.env.PINECONE_INDEX || "student-finance-index",
  usePinecone: (process.env.USE_PINECONE || "false").toLowerCase() === "true"
};

if (env.isProduction && env.jwtSecret === "change-me-in-production") {
  throw new Error("JWT_SECRET must be set to a strong value in production.");
}

module.exports = env;
