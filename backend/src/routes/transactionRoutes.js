const express = require("express");
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/auth");
const env = require("../config/env");
const {
  createTransaction,
  uploadTransactions,
  listTransactions,
  updateTransaction,
  deleteTransaction,
  exportTransactions,
} = require("../controllers/transactionController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mimeType = String(file.mimetype || "").toLowerCase();
    const allowedExtensions = new Set([".csv", ".xlsx", ".xls"]);
    const allowedMimeTypes = new Set([
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ]);

    if (allowedExtensions.has(extension) || allowedMimeTypes.has(mimeType)) {
      return callback(null, true);
    }

    return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
  },
});

router.use(auth);
router.post("/transactions", createTransaction);
router.get("/transactions", listTransactions);
router.get("/transactions/export", exportTransactions);
router.patch("/transactions/:id", updateTransaction);
router.delete("/transactions/:id", deleteTransaction);
router.post("/upload", upload.single("file"), uploadTransactions);

module.exports = router;
