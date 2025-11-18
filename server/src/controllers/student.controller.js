const mongoose = require('mongoose');
const toInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

// PUT /api/students/:userId/team
exports.upsertStudentTeam = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const Students = db.collection('students');

    const userId = toInt(req.params.userId);
    const teamId = toInt(req.body.team_id);

    if (!userId || !teamId) {
      return res.status(400).json({ success:false, message:'Invalid userId/team_id' });
    }

    await Students.updateOne(
      { user_id: { $in: [userId, String(userId)] } },
      { $set: { user_id: userId, team_id: teamId } },
      { upsert: true }
    );

    return res.json({ success:true, user_id: userId, team_id: teamId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success:false, message:'Failed to update team' });
  }
};
