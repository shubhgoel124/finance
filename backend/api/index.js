const app = require("../src/app");
const connectDb = require("../src/config/db");

// Database connection is established when function boots
connectDb();

// Export the Express API
module.exports = app;
