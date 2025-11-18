import express from "express";
import { verifyAccess } from "../middlewares/auth.js";
import MentorTeamAssign from "../models/mentorTeamAssign.model.js";

const router = express.Router();

/**
 * ✅ GET /mentor_team_assign — 전체 멘토-팀 배정 목록
 * (프론트에서 멘토 담당 팀 계산용)
 */
router.get("/", verifyAccess, async (req, res) => {
  try {
    const assigns = await MentorTeamAssign.find().lean();
    res.json(assigns);
  } catch (e) {
    console.error("GET /mentor_team_assign error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
