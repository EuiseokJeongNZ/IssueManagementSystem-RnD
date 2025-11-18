import mongoose from "mongoose";
const StudentSchema = new mongoose.Schema(
  {
    student_id: Number,
    user_id: { type: Number, required: true, unique: true },
    team_id: { type: Number, required: true },
  },
  { collection: "students" }
);
export default mongoose.model("Student", StudentSchema);
