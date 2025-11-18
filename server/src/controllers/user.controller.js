import User from "../models/user.model.js";
import { uploadToS3 } from "../config/s3.js";
import bcrypt from "bcryptjs";

// ✅ 내 프로필 조회
export const getMyProfile = async (req, res) => {
  try {
    const mongoId = req.auth?.sub;
    if (!mongoId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(mongoId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      team_name: user.team_name,
      mobile: user.mobile || "",
      address: user.address || "",
      city: user.city || "",
      zip_code: user.zip_code || "",
      avatar_url: user.avatar_url || null,
    });
  } catch (err) {
    console.error("❌ getMyProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ 내 프로필 수정 (이메일 + 비밀번호 + 아바타 업로드 + 일반정보)
export const updateMyProfile = async (req, res) => {
  try {
    const mongoId = req.auth?.sub;
    if (!mongoId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, email, mobile, address, city, zip_code, password } = req.body;
    let avatarUrl = null;

    // 🔹 이미지 파일이 포함된 경우
    if (req.file || (req.files && req.files.avatar && req.files.avatar[0])) {
      const file = req.file || req.files.avatar[0];
      const upload = await uploadToS3(file, "avatars/");
      avatarUrl = upload.Location;
      console.log("✅ Uploaded to S3:", avatarUrl);
    }

    // 🔹 업데이트 데이터 구성
    const updateData = {
      ...(name && { name }),
      ...(email && { email }),
      ...(mobile && { mobile }),
      ...(address && { address }),
      ...(city && { city }),
      ...(zip_code && { zip_code }),
      ...(avatarUrl && { avatar_url: avatarUrl }),
      updatedAt: new Date(),
    };

    // 🔹 비밀번호 변경 요청이 있으면 bcrypt로 해시 처리
    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      updateData.password = hashed;
    }

    const updated = await User.findByIdAndUpdate(
      mongoId,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      console.warn(`⚠️ User not found for _id=${mongoId}`);
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user: {
        user_id: updated.user_id,
        name: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        address: updated.address,
        city: updated.city,
        zip_code: updated.zip_code,
        avatar_url: updated.avatar_url,
      },
    });
  } catch (err) {
    console.error("❌ updateMyProfile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};