const express = require("express");
const auth = require("../middleware/auth");
const { upsertBudget, getBudgetStatus } = require("../controllers/budgetController");

const router = express.Router();

router.use(auth);
router.post("/budget", upsertBudget);
router.get("/budget", getBudgetStatus);

module.exports = router;
