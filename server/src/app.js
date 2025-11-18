import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import issuesRoutes from "./routes/issues.routes.js";
import usersRoutes from "./routes/users.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import calendarRoutes from "./routes/calendar.routes.js";
// import studentRoutes from "./routes/student.routes.js"; // 필요시만 사용
import mentorTeamAssignRoutes from "./routes/mentorTeamAssign.routes.js";

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
app.use("/calendar", calendarRoutes);
app.use("/mentor_team_assign", mentorTeamAssignRoutes);

export default app;
