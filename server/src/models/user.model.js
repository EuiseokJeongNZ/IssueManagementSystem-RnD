import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true, unique: true },
    user_autId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    password: { type: String, required: true },
    role_id: { type: Number, required: true },

    // 🟢 추가된 필드들
    team_name: { type: String, default: null },
    mobile: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    zip_code: { type: String, default: "" },
    avatar_url: { type: String, default: null },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // createdAt / updatedAt 자동 관리
  }
);

export default mongoose.model("User", userSchema);
