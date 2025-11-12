// utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

if (!process.env.API_KEY || !process.env.API_SECRET || !process.env.CLOUD_NAME) {
  throw new Error('Missing Cloudinary env vars. Ensure .env contains CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and CLOUDINARY_CLOUD_NAME and that import \'dotenv/config\' runs first in your entry file.');
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true
});

export default cloudinary;
