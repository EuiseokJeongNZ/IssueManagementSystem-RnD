import mongoose from "mongoose";

const MentorTeamAssignSchema = new mongoose.Schema(
  {
    mentor_user_id: { type: Number, required: true },
    team_id: { type: Number, required: true },
  },
  {
    _id: false, // ✅ DBML 복합키 구조로 맞춤
    collection: "mentor_team_assign",
    timestamps: false,
  }
);

MentorTeamAssignSchema.index({ mentor_user_id: 1, team_id: 1 }, { unique: true });

export default mongoose.model("MentorTeamAssign", MentorTeamAssignSchema);
