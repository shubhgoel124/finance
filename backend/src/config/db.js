const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const env = require("./env");

let memoryServer = null;

async function connectDb() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.mongoUri);
    console.log("MongoDB connected");
    return;
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    console.warn(
      "Primary MongoDB unavailable. Falling back to in-memory MongoDB for development.",
    );
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    console.log("In-memory MongoDB connected");
  }
}

module.exports = connectDb;
