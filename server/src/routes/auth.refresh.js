// src/routes/auth.refresh.js (동일 파일에 추가해도 됨)
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import RefreshToken from "../models/refreshToken.model.js";

router.post("/refresh", async (req, res) => {
  const rt = req.cookies?.rt;
  if (!rt) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);
    const tokens = await RefreshToken.find({ user: decoded.sub, revokedAt: { $exists: false } }).lean();

    // 해시 매칭되는 저장 RT 찾기
    const matched = await (async () => {
      for (const t of tokens) {
        if (await bcrypt.compare(rt, t.tokenHash)) return t;
      }
      return null;
    })();

    if (!matched || matched.expiresAt < new Date())
      return res.status(401).json({ message: "Unauthorized" });

    // 현재 RT 폐기(회전)
    await RefreshToken.updateOne({ _id: matched._id }, { $set: { revokedAt: new Date() } });

    // 새 RT+AT 발급
    const accessPayload = { sub: decoded.sub, role: req.user?.role ?? "student" }; // 미들웨어로 role 주입도 가능
    const accessToken = jwt.sign(accessPayload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.ACCESS_TTL || "15m",
    });

    const newRefresh = jwt.sign({ sub: decoded.sub, tokenId: cryptoRandom() }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.REFRESH_TTL || "7d",
    });
    const rtHash = await bcrypt.hash(newRefresh, 10);
    const expiresAt = new Date(Date.now() + ms(process.env.REFRESH_TTL || "7d"));
    await RefreshToken.create({ user: decoded.sub, tokenHash: rtHash, expiresAt });

    res.cookie("rt", newRefresh, { ...cookieOpts, expires: expiresAt });
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
});
