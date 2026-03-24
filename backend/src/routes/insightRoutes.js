const express = require("express");
const auth = require("../middleware/auth");
const { generateInsights } = require("../controllers/insightController");
const { chat } = require("../controllers/chatController");

const router = express.Router();

router.use(auth);
router.post("/insights", generateInsights);
router.post("/chat", chat);

module.exports = router;
