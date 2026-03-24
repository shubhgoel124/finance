const app = require("./app");
const connectDb = require("./config/db");
const env = require("./config/env");

async function start() {
  try {
    await connectDb();
    app.listen(env.port, () => {
      console.log(`Backend running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

start();
