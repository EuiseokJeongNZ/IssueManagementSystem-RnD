// src/controllers/issue.create.controller.js
const mongoose = require('mongoose');

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// POST /api/issues
exports.createIssue = async (req, res) => {
  try {
    const db       = mongoose.connection.db;
    const Issues   = db.collection('issues');
    const Students = db.collection('students');

    // 작성자
    const userIdHeader = req.header('X-User-Id');
    const userId = toInt(userIdHeader);

    // 요청 바디
    const {
      title,
      description = '',
      severity,            // 'low' | 'medium' | 'high'
      issue_scope,         // 'team' | 'individual'
      semester,            // 1 | 2
      impact,              // 'individual' | 'group'  <-- 다시 사용
      team_id              // 선택: 클라가 주면 우선 사용
    } = req.body || {};

    // 기본 검증
    if (!userId) return res.status(400).json({ success:false, message:'Missing user' });
    if (!title || !title.trim()) return res.status(400).json({ success:false, message:'Title required' });
    if (!['team','individual'].includes(issue_scope)) return res.status(400).json({ success:false, message:'Invalid issue_scope' });
    if (!['low','medium','high'].includes(severity))  return res.status(400).json({ success:false, message:'Invalid severity' });
    if (![1,2,'1','2'].includes(semester))           return res.status(400).json({ success:false, message:'Invalid semester' });
    if (!['individual','group'].includes(impact))    return res.status(400).json({ success:false, message:'Invalid impact' });

    // team_id 결정 규칙
    // - impact === 'group' 이면 issue_scope가 무엇이든 team_id 반드시 필요
    // - impact === 'individual' 이면 team_id = null (개인 이슈로 처리)
    let finalTeamId = null;

    if (impact === 'group') {
      // 1) 클라에서 준 team_id 우선
      finalTeamId = toInt(team_id);

      // 2) 없으면 students에서 내 팀 검색
      if (!finalTeamId) {
        const me = await Students.findOne({ user_id: { $in: [userId, String(userId)] } });
        if (me?.team_id != null) finalTeamId = toInt(me.team_id);
      }

      // 3) 그래도 없으면 에러
      if (!finalTeamId) {
        return res.status(400).json({ success:false, message:'Team issue requires team_id (impact=group)' });
      }
    } else {
      // impact === 'individual' 인 경우는 항상 팀 없이 저장
      finalTeamId = null;
    }

    // 새 issue_id (데모용)
    const nextIssueId = (await Issues.estimatedDocumentCount()) + 1;

    const doc = {
      issue_id     : nextIssueId,
      submitted_by : userId,
      team_id      : finalTeamId,                // impact=group이면 값, individual이면 null
      issue_scope  : issue_scope,                // 'individual' | 'team' (화면 선택 유지)
      title        : title.trim().slice(0,200),
      description  : String(description || ''),
      severity     : severity,
      impact       : impact,                     // 저장도 해둠
      status       : 'open',
      semester     : toInt(semester),
      created_at   : new Date(),
    };

    await Issues.insertOne(doc);
    return res.status(201).json({ success:true, item: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success:false, message:'Failed to create issue' });
  }
};
