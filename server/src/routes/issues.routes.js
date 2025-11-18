import express from "express";
import nodemailer from "nodemailer";
import Issue from "../models/issue.model.js";
import User from "../models/user.model.js";
import Student from "../models/student.model.js";
import MentorTeamAssign from "../models/mentorTeamAssign.model.js";
import Team from "../models/team.model.js";
import { verifyAccess } from "../middlewares/auth.js";

const router = express.Router();

/**
 * ✅ GET /issues — 리스트 조회 (역할별 접근 제어 + 검색/필터링)
 */
router.get("/", verifyAccess, async (req, res) => {
  try {
    const userId = req.auth?.sub;
    const me = await User.findById(userId).lean();
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const { q, severity, status, scope } = req.query;
    const base = {};
    if (q) {
      const num = Number(q);
      base.$or = [
        { title: { $regex: q, $options: "i" } },
        ...(Number.isFinite(num) ? [{ issue_id: num }, { team_id: num }] : []),
      ];
    }
    if (severity) base.severity = severity;
    if (status) base.status = status;
    if (scope) base.issue_scope = scope;

    let acl = {};
    if (me.role_id === 3) {
      // 학생: 본인 팀 + 개인 이슈
      const stu = await Student.findOne({ user_id: me.user_id }).lean();
      const myTeamId = stu?.team_id ?? null;
      acl = {
        $or: [
          ...(myTeamId ? [{ issue_scope: "team", team_id: myTeamId }] : []),
          { issue_scope: "individual", submitted_by: me.user_id },
        ],
      };
    } else if (me.role_id === 2) {
      // 멘토: 담당 팀 이슈만
      const assigns = await MentorTeamAssign.find({ mentor_user_id: me.user_id }).lean();
      const teamIds = assigns.map((a) => a.team_id);
      acl = teamIds.length
        ? { $or: [{ issue_scope: "team", team_id: { $in: teamIds } }] }
        : { _id: null };
    } else {
      // Admin: 전체 접근
      acl = {};
    }

    const finalFilter = { ...base, ...acl };
    const items = await Issue.find(finalFilter).sort({ created_at: -1 }).lean();
    res.json({ items, total: items.length });
  } catch (e) {
    console.error("GET /issues error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ GET /issues/:id — 상세 조회 (작성자 + 팀 정보 + 모든 멤버 포함)
 */
router.get("/:id", verifyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findOne({ issue_id: Number(id) }).lean();
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const authorUser = await User.findOne({ user_id: issue.submitted_by }).lean();
    const author = authorUser
      ? {
          user_id: authorUser.user_id,
          name: authorUser.name,
          role_id: authorUser.role_id,
          role_name:
            authorUser.role_id === 1
              ? "Admin"
              : authorUser.role_id === 2
              ? "Mentor"
              : "Student",
          email: authorUser.email,
        }
      : null;

    // ✅ 팀 멤버 + Admin 포함
    let teamInfo = null;
    if (issue.team_id) {
      const team = await Team.findOne({ team_id: issue.team_id }).lean();
      const students = await Student.find({ team_id: issue.team_id }).lean();
      const studentUserIds = students.map((s) => s.user_id);
      const mentors = await MentorTeamAssign.find({ team_id: issue.team_id }).lean();
      const mentorUserIds = mentors.map((m) => m.mentor_user_id);
      const admins = await User.find({ role_id: 1 }).lean();
      const adminUserIds = admins.map((a) => a.user_id);

      const allUserIds = [...new Set([...studentUserIds, ...mentorUserIds, ...adminUserIds])];
      const members = await User.find({ user_id: { $in: allUserIds } }).lean();

      teamInfo = {
        team_id: issue.team_id,
        team_name: team?.team_name || "-",
        members: members.map((u) => ({
          user_id: u.user_id,
          name: u.name,
          role:
            u.role_id === 1 ? "Admin" : u.role_id === 2 ? "Mentor" : "Student",
        })),
      };
    } else {
      const admins = await User.find({ role_id: 1 }).lean();
      teamInfo = {
        team_id: null,
        team_name: "-",
        members: admins.map((a) => ({
          user_id: a.user_id,
          name: a.name,
          role: "Admin",
        })),
      };
    }

    res.json({
      ...issue,
      author,
      team: teamInfo,
    });
  } catch (e) {
    console.error("GET /issues/:id error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ POST /issues — 이슈 생성
 */
router.post("/", verifyAccess, async (req, res) => {
  try {
    const userMongoId = req.auth?.sub;
    const me = await User.findById(userMongoId).lean();
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const {
      title,
      description,
      severity,
      issue_scope,
      impact,
      semester,
      attachments = [],
    } = req.body;

    if (!title || !severity || !issue_scope || !impact) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let team_id = null;
    if (me.role_id === 3 && issue_scope === "team") {
      const stu = await Student.findOne({ user_id: me.user_id }).lean();
      team_id = stu?.team_id ?? null;
      if (!team_id) return res.status(400).json({ message: "Student has no team" });
    }

    const last = await Issue.findOne().sort({ issue_id: -1 }).lean();
    const nextIssueId = (last?.issue_id || 0) + 1;

    const newIssue = await Issue.create({
      issue_id: nextIssueId,
      submitted_by: me.user_id,
      team_id,
      issue_scope,
      title,
      description,
      severity,
      impact,
      status: "open",
      semester: semester ?? 1,
      attachments,
      email_logs: [],
      created_at: new Date(),
    });

    res.json({ ok: true, issue: newIssue });
  } catch (e) {
    console.error("POST /issues error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ PATCH /issues/:id/resolve — Admin & Mentor only
 */
router.patch("/:id/resolve", verifyAccess, async (req, res) => {
  try {
    const mongoId = req.auth.sub;
    const me = await User.findById(mongoId).lean();
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const issue = await Issue.findOne({ issue_id: Number(id) }).lean();
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    if (me.role_id === 1) {
      await Issue.updateOne(
        { issue_id: issue.issue_id },
        { $set: { status: "resolved", resolved_at: new Date() } }
      );
      return res.json({ message: "Issue resolved by admin" });
    }

    if (me.role_id === 2) {
      const assigns = await MentorTeamAssign.find({ mentor_user_id: me.user_id }).lean();
      const myTeams = assigns.map((a) => a.team_id);
      if (!myTeams.includes(issue.team_id))
        return res.status(403).json({ message: "Permission denied" });

      await Issue.updateOne(
        { issue_id: issue.issue_id },
        { $set: { status: "resolved", resolved_at: new Date() } }
      );
      return res.json({ message: "Issue resolved by mentor" });
    }

    res.status(403).json({ message: "Permission denied" });
  } catch (e) {
    console.error("PATCH /issues/:id/resolve error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ PATCH /issues/:id/severity — Admin & Mentor only
 */
router.patch("/:id/severity", verifyAccess, async (req, res) => {
  try {
    const mongoId = req.auth.sub;
    const me = await User.findById(mongoId).lean();
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { severity } = req.body;

    if (!["low", "medium", "high"].includes(severity))
      return res.status(400).json({ message: "Invalid severity value" });

    const issue = await Issue.findOne({ issue_id: Number(id) }).lean();
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    if (me.role_id === 1) {
      await Issue.updateOne({ issue_id: issue.issue_id }, { $set: { severity } });
      return res.json({ message: "Severity updated by admin" });
    }

    if (me.role_id === 2) {
      const assigns = await MentorTeamAssign.find({ mentor_user_id: me.user_id }).lean();
      const myTeams = assigns.map((a) => a.team_id);
      if (!myTeams.includes(issue.team_id))
        return res.status(403).json({ message: "Permission denied" });

      await Issue.updateOne({ issue_id: issue.issue_id }, { $set: { severity } });
      return res.json({ message: "Severity updated by mentor" });
    }

    res.status(403).json({ message: "Permission denied" });
  } catch (e) {
    console.error("PATCH /issues/:id/severity error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ PATCH /issues/:id/status — Admin & Mentor only
 */
router.patch("/:id/status", verifyAccess, async (req, res) => {
  try {
    const mongoId = req.auth.sub;
    const me = await User.findById(mongoId).lean();
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "in_progress", "resolved"].includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const issue = await Issue.findOne({ issue_id: Number(id) }).lean();
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    if (me.role_id === 1) {
      await Issue.updateOne(
        { issue_id: issue.issue_id },
        { $set: { status, ...(status === "resolved" ? { resolved_at: new Date() } : {}) } }
      );
      return res.json({ message: `Status updated to '${status}' by admin` });
    }

    if (me.role_id === 2) {
      const assigns = await MentorTeamAssign.find({ mentor_user_id: me.user_id }).lean();
      const myTeams = assigns.map((a) => a.team_id);
      if (!myTeams.includes(issue.team_id))
        return res.status(403).json({ message: "Permission denied" });

      await Issue.updateOne(
        { issue_id: issue.issue_id },
        { $set: { status, ...(status === "resolved" ? { resolved_at: new Date() } : {}) } }
      );
      return res.json({ message: `Status updated to '${status}' by mentor` });
    }

    res.status(403).json({ message: "Permission denied" });
  } catch (e) {
    console.error("PATCH /issues/:id/status error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ POST /issues/:id/email — Admin & Mentor only (이메일 전송 + 로그 기록)
 */
router.post("/:id/email", verifyAccess, async (req, res) => {
  try {
    const mongoId = req.auth.sub;
    const me = await User.findById(mongoId).lean();
    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (![1, 2].includes(me.role_id))
      return res.status(403).json({ message: "Permission denied" });

    const { id } = req.params;
    const { subject, message } = req.body;
    if (!subject || !message)
      return res.status(400).json({ message: "Missing email content" });

    const issue = await Issue.findOne({ issue_id: Number(id) }).lean();
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const reporter = await User.findOne({ user_id: issue.submitted_by }).lean();
    if (!reporter?.email)
      return res.status(400).json({ message: "Reporter email not found" });

    // ✅ 실제 이메일 전송
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Issue Management System" <${process.env.EMAIL_USER}>`,
      to: reporter.email,
      subject,
      text: message,
    });

    // ✅ 로그 추가
    await Issue.updateOne(
      { issue_id: issue.issue_id },
      {
        $push: {
          email_logs: {
            sender_user_id: me.user_id,
            sender_name: me.name,
            sender_role: me.role_id === 1 ? "Admin" : "Mentor",
            subject,
            sent_at: new Date(),
          },
        },
      }
    );

    res.json({ message: "Email sent and logged successfully" });
  } catch (e) {
    console.error("POST /issues/:id/email error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
