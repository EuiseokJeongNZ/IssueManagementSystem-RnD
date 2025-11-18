// src/index.js
import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";   // ✅ server.js ❌ → app.js ✅

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/issueTracker";

async function bootstrap() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
    app.listen(PORT, () =>
      console.log(`🚀 API listening on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ MongoDB connect error:", err.message);
    process.exit(1);
  }
}

bootstrap();
