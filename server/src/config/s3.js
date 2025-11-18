// server/src/config/s3.js

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import crypto from "crypto";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;

export const s3 = new S3Client({ region: REGION });

// presignedPost
export async function makePresignedPost(
  key,
  contentType = "application/octet-stream"
) {
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Fields: { "Content-Type": contentType },
    Conditions: [
      ["starts-with", "$Content-Type", ""],
      ["content-length-range", 0, 10 * 1024 * 1024],
    ],
    Expires: 60,
  });

  const publicUrl = process.env.S3_PUBLIC_BASE_URL
    ? `${process.env.S3_PUBLIC_BASE_URL}/${key}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { url, fields, key, publicUrl };
}

export async function uploadToS3(file, folder = "uploads/") {
  if (!file || !file.buffer) throw new Error("Invalid file buffer");
  const ext = file.originalname?.split(".").pop() || "jpg";
  const key = `${folder}${crypto.randomUUID()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype || "application/octet-stream",
  });

  await s3.send(cmd);

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { Location: url };
}
