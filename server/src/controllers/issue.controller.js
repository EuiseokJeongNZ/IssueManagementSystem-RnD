// src/controllers/issue.controller.js
const mongoose = require('mongoose');

// 숫자 변환 헬퍼
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// GET /api/issues
const getIssues = async (req, res) => {
  try {
    const db       = mongoose.connection.db;
    const Issues   = db.collection('issues');
    const Students = db.collection('students');
    const MTA      = db.collection('mentor_team_assign');

    // -------- query params --------
    const status = (req.query.status || 'all').toLowerCase();
    const sort   = req.query.sort === 'oldest' ? 'oldest' : 'newest';
    const page   = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip   = (page - 1) * limit;

    // -------- headers --------
    const userIdHeader = req.header('X-User-Id');
    const roleId       = parseInt(req.header('X-Role-Id') || '0', 10);

    const userIdNum = toInt(userIdHeader);
    const userIdAny = userIdNum != null
      ? [userIdNum, String(userIdNum)]
      : (userIdHeader ? [userIdHeader] : []);

    // -------- 기본 match --------
    const match = {};
    if (status !== 'all') match.status = status;

    // -------- 권한별 가시성 --------
    if (roleId === 1 && userIdAny.length) {
      // 학생
      const me = await Students.findOne({ user_id: { $in: userIdAny } });
      const myTeam = me?.team_id ?? null;
      match.$or = [
        { issue_scope: 'individual', submitted_by: { $in: userIdAny } },
      ];
      if (myTeam != null) {
        match.$or.push({ issue_scope: 'team', team_id: { $in: [myTeam, String(myTeam)] } });
      }
    } else if (roleId === 2 && userIdAny.length) {
      // 멘토
      const teams = await MTA.find({ mentor_user_id: { $in: userIdAny } })
        .project({ team_id: 1, _id: 0 })
        .toArray();

      const teamIds = teams.map(t => t.team_id);
      const teamIdsMixed = [...teamIds, ...teamIds.map(t => String(t))];

      match.$or = [
        { team_id: { $in: teamIdsMixed } },
        { issue_scope: 'individual', submitted_by: { $in: userIdAny } },
      ];
    }

    // -------- 정렬 --------
    const sortOpt = sort === 'oldest' ? { created_at: 1 } : { created_at: -1 };

    // -------- 조회 (teams 조인 추가) --------
    const total = await Issues.countDocuments(match);

    const items = await Issues.aggregate([
      { $match: match },

      // 🔗 teams 조인 (양쪽을 문자열로 변환해 타입 섞임 방지)
      {
        $lookup: {
          from: "teams",
          let: { tid: "$team_id" },
          pipeline: [
            { $addFields: { tid_str: { $toString: "$team_id" } } },
            { $match: { $expr: { $eq: ["$tid_str", { $toString: "$$tid" }] } } },
          ],
          as: "team_info",
        },
      },
      { $unwind: { path: "$team_info", preserveNullAndEmptyArrays: true } },

      // 🏷 팀 이름 필드로 추가
      { $addFields: { team_name: "$team_info.team_name" } },

      { $sort: sortOpt },
      { $skip: skip },
      { $limit: limit },
    ]).toArray();

    return res.json({ items, total, page, limit });


  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch issues' });
  }
};

module.exports = { getIssues };
