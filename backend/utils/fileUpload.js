import getDataUri from "./datauri.js";
import cloudinary from "./cloudinary.js";

const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadProfilePhoto(file) {
  if (!file) return "";

  const fileUri = getDataUri(file);
  const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
  return cloudResponse.secure_url;
}

export async function uploadResume(file) {
  if (!file) return null;

  if (!RESUME_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error("Unsupported resume file type.");
    err.status = 400;
    throw err;
  }

  if (file.size > MAX_RESUME_BYTES) {
    const err = new Error("Resume file too large (max 5MB).");
    err.status = 400;
    throw err;
  }

  const fileUri = getDataUri(file);
  const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
    folder: "resumes",
    resource_type: "auto",
  });

  return {
    url: cloudResponse.secure_url,
    originalName: file.originalname,
  };
}
