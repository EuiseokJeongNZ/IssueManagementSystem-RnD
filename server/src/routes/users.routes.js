// server/src/routes/users.routes.js
import express from "express";
import multer from "multer";
import User from "../models/user.model.js";
import Student from "../models/student.model.js";
import Team from "../models/team.model.js";
import MentorTeamAssign from "../models/mentorTeamAssign.model.js";
import { verifyAccess } from "../middlewares/auth.js";
import { updateMyProfile } from "../controllers/user.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/** ✅ GET /users — 같은 팀 유저 + admin 항상 포함 + 연락처/아바타 포함 */
router.get("/", verifyAccess, async (req, res) => {
  try {
    const meMongoId = req.auth.sub;
    const me = await User.findById(meMongoId).lean();
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const users = await User.find().lean();
    const students = await Student.find().lean();
    const teams = await Team.find().lean();
    const mentorTeams = await MentorTeamAssign.find().lean();

    let visibleUserIds = [];

    /** ✅ Admin: 전체 */
    if (me.role_id === 1) {
      visibleUserIds = users.map((u) => u.user_id);
    }

    /** ✅ Student: 같은 팀 학생 + 멘토 + 자기자신 + Admin */
    else if (me.role_id === 3) {
      const meStudent = students.find((s) => s.user_id === me.user_id);
      if (meStudent?.team_id) {
        const sameTeamStudents = students.filter(
          (s) => s.team_id === meStudent.team_id
        );
        const sameTeamMentors = mentorTeams.filter(
          (m) => m.team_id === meStudent.team_id
        );

        visibleUserIds = [
          me.user_id, // 자기 자신
          ...sameTeamStudents.map((s) => s.user_id),
          ...sameTeamMentors.map((m) => m.mentor_user_id),
        ];
      } else {
        // ✅ 팀 미배정 학생도 admin 포함
        visibleUserIds = [
          me.user_id,
          ...users.filter((u) => u.role_id === 1).map((u) => u.user_id),
        ];
      }
    }

    /** ✅ Mentor: 담당 팀 학생 + 같은 팀 멘토 + 자기자신 + Admin */
    else if (me.role_id === 2) {
      const myTeams = mentorTeams
        .filter((m) => m.mentor_user_id === me.user_id)
        .map((m) => m.team_id);

      const relatedStudents = students.filter((s) =>
        myTeams.includes(s.team_id)
      );

      // ✅ 같은 팀의 다른 멘토들도 포함
      const relatedMentors = mentorTeams
        .filter((m) => myTeams.includes(m.team_id))
        .map((m) => m.mentor_user_id);

      visibleUserIds = [
        me.user_id, // 자기 자신
        ...relatedStudents.map((s) => s.user_id),
        ...relatedMentors,
      ];
    }

    /** ✅ 항상 Admin 포함 */
    const adminUserIds = users
      .filter((u) => u.role_id === 1)
      .map((u) => u.user_id);

    // ✅ 중복 제거 + admin 포함 보장
    visibleUserIds = Array.from(new Set([...visibleUserIds, ...adminUserIds]));

    /** ✅ 자기자신 포함 보장 */
    if (!visibleUserIds.includes(me.user_id)) {
      visibleUserIds.push(me.user_id);
    }

    /** ✅ 응답 리스트 생성 (멘토 team_id 보정 포함) */
    const list = users
      .filter((u) => visibleUserIds.includes(u.user_id))
      .map((u) => {
        const stu = students.find((s) => s.user_id === u.user_id);
        const team = stu
          ? teams.find((t) => t.team_id === stu.team_id)
          : null;

        // ✅ 멘토의 팀 ID 보정 (null 방지)
        const mentorAssigned = mentorTeams.find(
          (m) => m.mentor_user_id === u.user_id
        );
        const mentorTeam = mentorAssigned
          ? teams.find((t) => t.team_id === mentorAssigned.team_id)
          : null;

        return {
          user_id: u.user_id,
          user_autId: u.user_autId || "-",
          name: u.name,
          email: u.email,
          role_id: u.role_id,
          team_id: stu?.team_id ?? mentorAssigned?.team_id ?? null,
          team_name: team?.team_name || mentorTeam?.team_name || null,
          mobile: u.mobile || "",
          address: u.address || "",
          city: u.city || "",
          zip_code: u.zip_code || "",
          avatar_url: u.avatar_url || null,
        };
      });

    res.json(list);
  } catch (e) {
    console.error("GET /users error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/** ✅ GET /users/me — 로그인된 사용자 정보 (프로필) */
router.get("/me", verifyAccess, async (req, res) => {
  try {
    const mongoId = req.auth.sub;
    const user = await User.findById(mongoId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const student = await Student.findOne({ user_id: user.user_id }).lean();
    const team = student
      ? await Team.findOne({ team_id: student.team_id }).lean()
      : null;

    /** ✅ Mentor 전용: 담당 팀 목록 추가 */
    let mentor_team_ids = [];
    if (user.role_id === 2) {
      const mentorTeams = await MentorTeamAssign.find({
        mentor_user_id: user.user_id,
      }).lean();
      mentor_team_ids = mentorTeams.map((m) => m.team_id);
    }

    res.json({
      id: String(user._id),
      user_id: user.user_id,
      user_autId: user.user_autId || null,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      team_id: student?.team_id ?? null,
      team_name: team?.team_name || null,
      mentor_team_ids,
      mobile: user.mobile || "",
      address: user.address || "",
      city: user.city || "",
      zip_code: user.zip_code || "",
      avatar_url: user.avatar_url || null,
    });
  } catch (e) {
    console.error("GET /users/me error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/** ✅ PATCH /users/me — 프로필 업데이트 */
router.patch(
  "/me",
  verifyAccess,
  upload.fields([{ name: "avatar", maxCount: 1 }]),
  updateMyProfile
);

export default router;
