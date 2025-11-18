// server/src/middlewares/upload.js
import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3.js";
import { v4 as uuid } from "uuid";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function fileFilter(req, file, cb) {
  if (!ALLOWED.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type"), false);
  }
  cb(null, true);
}

/** issues/2025-10-20/uuid-name.ext 형태로 저장 */
const storage = multerS3({
  s3,
  bucket: process.env.S3_BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  acl: "public-read", // 버킷이 공개가 아니면 제거하고 presigned URL로 접근
  key: (req, file, cb) => {
    const date = new Date().toISOString().split("T")[0];
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    const key = `issues/${date}/${uuid()}-${safeName}`;
    cb(null, key);
  },
});

export const uploadIssueFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
}).array("attachments", 10); // 프론트에서 name="attachments"
