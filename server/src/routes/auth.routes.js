// server/src/routes/auth.routes.js
import express from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Joi from "joi";
import crypto from "crypto";
import User from "../models/user.model.js";
import RefreshToken from "../models/refreshToken.model.js";

const router = express.Router();

/* ================== helpers ================== */
const isProd = (process.env.NODE_ENV || "development") === "production";
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: "strict",
  path: "/auth",
};

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = Joi.object({
  id: Joi.string().required(), 
  password: Joi.string().min(3).max(128).required(), 
});

function ms(str) {
  const m = /^(\d+)([smhd])$/.exec(str);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
  return n * unit;
}

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TTL || "15m",
  });
}

function signRefresh(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TTL || "7d",
  });
}
const ROLE_MAP = {
  1: "admin",
  2: "mentor",
  3: "student",  
  4: "moderator",
  5: "teaching_team",
  6: "it_person",
};

/* ================== /auth/login ================== */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { value, error } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) return res.status(400).json({ message: "Invalid credentials" });

    const rawId = value.id.trim();
    let user = null;

    user = await User.findOne({ user_autId: rawId }).lean();
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isHashed = typeof user.password === "string" && user.password.startsWith("$2");
    const passwordOk = isHashed
      ? await bcrypt.compare(value.password, user.password)
      : value.password === user.password;

    if (!passwordOk) return res.status(401).json({ message: "Invalid credentials" });

    const role = ROLE_MAP[user.role_id] || "student";
    const accessPayload = { sub: String(user._id), role };
    const accessToken = signAccess(accessPayload);

    const tokenId = crypto.randomUUID();
    const refreshToken = signRefresh({ sub: accessPayload.sub, jti: tokenId });

    const rtHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + ms(process.env.REFRESH_TTL || "7d"));
    await RefreshToken.create({ user: user._id, tokenHash: rtHash, expiresAt });

    res.cookie("rt", refreshToken, { ...cookieOpts, expires: expiresAt });
    res.json({
      accessToken,
      user: {
        id: user._id,
        user_id: user.user_id,
        user_autId: user.user_autId,
        name: user.name,
        role,
        role_id: user.role_id,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================== /auth/refresh ================== */
router.post("/refresh", async (req, res) => {
  try {
    const rt = req.cookies?.rt;
    if (!rt) return res.status(401).json({ message: "Unauthorized" });

    let decoded;
    try {
      decoded = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const candidates = await RefreshToken.find({
      user: decoded.sub,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).lean();

    let matched = null;
    for (const t of candidates) {
      if (await bcrypt.compare(rt, t.tokenHash)) {
        matched = t;
        break;
      }
    }
    if (!matched) return res.status(401).json({ message: "Unauthorized" });

    await RefreshToken.updateOne({ _id: matched._id }, { $set: { revokedAt: new Date() } });

    const user = await User.findById(decoded.sub).lean();
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const role = ROLE_MAP[user.role_id] || "student";

    const accessToken = signAccess({ sub: String(decoded.sub), role });

    const newRefresh = signRefresh({ sub: String(decoded.sub), jti: crypto.randomUUID() });
    const rtHash = await bcrypt.hash(newRefresh, 10);
    const expiresAt = new Date(Date.now() + ms(process.env.REFRESH_TTL || "7d"));
    await RefreshToken.create({ user: decoded.sub, tokenHash: rtHash, expiresAt });

    res.cookie("rt", newRefresh, { ...cookieOpts, expires: expiresAt });
    res.json({ accessToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================== /auth/logout ================== */
router.post("/logout", async (req, res) => {
  try {
    const rt = req.cookies?.rt;
    if (rt) {
      const tokens = await RefreshToken.find({ revokedAt: { $exists: false } });
      for (const t of tokens) {
        if (await bcrypt.compare(rt, t.tokenHash)) {
          await RefreshToken.updateOne({ _id: t._id }, { $set: { revokedAt: new Date() } });
          break;
        }
      }
    }
    res.clearCookie("rt", { ...cookieOpts, expires: new Date(0) });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
