import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema(
  {
    key: String,
    url: String,
    name: String,
    type: String,
    size: Number,
  },
  { _id: false }
);

const IssueSchema = new mongoose.Schema(
  {
    issue_id: { type: Number, required: true, index: true, unique: true },
    submitted_by: { type: Number, required: true },        // users.user_id
    team_id: { type: Number, default: null },
    issue_scope: { type: String, enum: ["team", "individual"], required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: "" },
    severity: { type: String, enum: ["low", "medium", "high"], required: true },
    impact: { type: String, enum: ["individual", "group"], required: true },
    status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
    semester: { type: Number, default: 1 },
    attachments: { type: [AttachmentSchema], default: [] }, // ⬅️ 추가
    created_at: { type: Date, default: Date.now },
  },
  { collection: "issues" }
);

export default mongoose.model("Issue", IssueSchema);
