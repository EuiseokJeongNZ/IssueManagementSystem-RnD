// server/src/models/issueComment.model.js
import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema(
  { key: String, url: String, name: String, type: String, size: Number },
  { _id: false }
);

const IssueCommentSchema = new mongoose.Schema(
  {
    issue_id: { type: Number, required: true, index: true },
    author_user_id: { type: Number, required: true },
    content: { type: String, default: "" },
    attachments: [AttachmentSchema],
    created_at: { type: Date, default: Date.now },
  },
  { collection: "issue_comments" }
);

export default mongoose.model("IssueComment", IssueCommentSchema);
