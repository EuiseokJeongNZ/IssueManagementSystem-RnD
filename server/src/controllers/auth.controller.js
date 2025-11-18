// server/src/controllers/auth.controller.js

import User from "../models/user.model.js";
import { uploadToS3 } from "../config/s3.js";

// My profile
export const getMyProfile = async (req, res) => {
  try {
    const mongoId = req.auth?.sub;
    if (!mongoId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(mongoId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

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

// Modify my profile
export const updateMyProfile = async (req, res) => {
  try {
    const mongoId = req.auth?.sub;
    if (!mongoId) return res.status(401).json({ message: "Unauthorized" });

    const { name, mobile, address, city, zip_code } = req.body;
    let avatarUrl = null;

    // If avatar file is uploaded, upload to S3
    if (req.file || req.files?.avatar) {
      const file = req.file || req.files.avatar;
      const upload = await uploadToS3(file, "avatars/");
      avatarUrl = upload.Location;
    }

    const updateData = {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(address && { address }),
      ...(city && { city }),
      ...(zip_code && { zip_code }),
      ...(avatarUrl && { avatar_url: avatarUrl }),
      updatedAt: new Date(),
    };

    // Update user profile
    const updated = await User.findByIdAndUpdate(
      mongoId,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user: {
        name: updated.name,
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
