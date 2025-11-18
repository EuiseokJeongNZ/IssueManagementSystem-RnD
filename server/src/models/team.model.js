// server/src/models/team.model.js
import mongoose from "mongoose";

// 🔸 Team 스키마 정의
const TeamSchema = new mongoose.Schema(
  {
    team_id: {
      type: Number,
      required: true,
      unique: true,
    },
    team_name: {
      type: String,
      required: true,
      trim: true,
    },
    project_title: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    collection: "teams", // ✅ 실제 MongoDB 컬렉션 이름 (이미 확인됨)
    timestamps: false,   // createdAt, updatedAt 자동 추가 안 함
  }
);

// 🔸 JSON 변환 시 _id, __v 제거 (프론트 보기 깔끔하게)
TeamSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    delete ret._id;
  },
});

// 🔸 모델 export
const Team = mongoose.model("Team", TeamSchema);
export default Team;
