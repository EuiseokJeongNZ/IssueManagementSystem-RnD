import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import issuesRoutes from "./routes/issues.routes.js";
import usersRoutes from "./routes/users.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
// import studentRoutes from "./routes/student.routes.js"; // ✅ 만약 존재한다면 추가
import calendarRoutes from "./routes/calendar.routes.js"; // ✅ 달력 라우트 추가

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ 라우트 등록
app.use("/auth", authRoutes);
app.use("/issues", issuesRoutes);
app.use("/users", usersRoutes);
app.use("/uploads", uploadsRoutes);
// app.use("/students", studentRoutes); // (선택)
app.use("/calendar", calendarRoutes); // ✅ 추가됨

export default app;
