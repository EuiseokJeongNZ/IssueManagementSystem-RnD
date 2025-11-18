// server/src/routes/uploads.routes.js (ESM)
import express from "express";
import { makePresignedPost } from "../config/s3.js";
import { verifyAccess } from "../middlewares/auth.js";

const router = express.Router();

router.post("/presign-batch", verifyAccess, async (req, res, next) => {
  try {
    const files = Array.isArray(req.body.files) ? req.body.files : [];

    const items = await Promise.all(
      files.map((f) => {
        const safe = String(f.name || "file").replace(/[^\w.\-.]/g, "_").slice(-120);
        const ext = safe.includes(".") ? safe.split(".").pop() : "bin";
        const key = `issues/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        return makePresignedPost(key, f.type || "application/octet-stream");
      })
    );

    res.json(items);
  } catch (err) {
    next(err);
  }
});

export default router;
