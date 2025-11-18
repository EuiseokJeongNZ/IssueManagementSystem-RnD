import jwt from "jsonwebtoken";

export function verifyAccess(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.auth = decoded;

    req.user = {
      id: decoded.sub || decoded._id || decoded.user_id || decoded.id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
      team_id: decoded.team_id || null,
    };

    if (!req.user.id && !decoded.sub && !decoded._id) {
      console.warn("⚠️ JWT payload에 사용자 ID 필드(sub/_id/user_id)가 없습니다.");
      return res.status(401).json({ message: "Invalid token payload" });
    }

    next();
  } catch (err) {
    console.error("❌ verifyAccess 오류:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
