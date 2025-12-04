// services/user.service.js
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { parseSkills } from "../utils/parseSkills.js";
import { uploadProfilePhoto, uploadResume } from "../utils/fileUpload.js";

const DEFAULT_JWT_EXPIRY = "1d";

export async function registerUser({ fullname, email, phoneNumber, password, role, profileFile }) {
  if (!fullname || !email || !phoneNumber || !password || !role) {
    const err = new Error("fullname, email, phoneNumber, password and role are required.");
    err.status = 400;
    throw err;
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const err = new Error("User already exists with this email.");
    err.status = 400;
    throw err;
  }

  let profilePhotoUrl = "";
  if (profileFile) {
    try {
      profilePhotoUrl = await uploadProfilePhoto(profileFile);
    } catch (e) {
      const err = new Error("Failed to upload profile photo.");
      err.status = 502;
      throw err;
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = await User.create({
      fullname: String(fullname).trim(),
      email: normalizedEmail,
      phoneNumber,
      password: hashedPassword,
      role,
      profile: { profilePhoto: profilePhotoUrl },
    });

    return {
      _id: newUser._id,
      fullname: newUser.fullname,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      profile: newUser.profile,
    };
  } catch (createErr) {
    if (createErr.code === 11000 && createErr.keyPattern && createErr.keyPattern.email) {
      const err = new Error("User already exists with this email.");
      err.status = 409;
      throw err;
    }
    throw createErr;
  }
}

export async function loginUser({ email, password, role }) {
  if (!email || !password || !role) {
    const err = new Error("Email, password and role are required.");
    err.status = 400;
    throw err;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedRole = String(role).trim();
  const invalidCredsMsg = "Incorrect email, password or role.";

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.role !== normalizedRole || !user.password) {
    const err = new Error(invalidCredsMsg);
    err.status = 400;
    throw err;
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    const err = new Error(invalidCredsMsg);
    err.status = 400;
    throw err;
  }

  const tokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const token = jwt.sign(tokenPayload, process.env.SECRET_KEY, { expiresIn: DEFAULT_JWT_EXPIRY });

  const safeUser = {
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
  };

  return { token, user: safeUser };
}

export async function updateUserProfile({ userId, data, file }) {
  const { fullname, email, phoneNumber, bio, skills } = data;

  if (email && typeof email !== "string") {
    const err = new Error("Invalid email.");
    err.status = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  if (email && email !== user.email) {
    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error("Email already in use by another account.");
      err.status = 409;
      throw err;
    }
    user.email = email;
  }

  if (!user.profile) user.profile = {};

  const skillsArray = parseSkills(skills);

  if (fullname) user.fullname = fullname;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (bio) user.profile.bio = bio;
  if (skillsArray.length) user.profile.skills = skillsArray;

  if (file) {
    const resumeInfo = await uploadResume(file);
    if (resumeInfo) {
      user.profile.resume = resumeInfo.url;
      user.profile.resumeOriginalName = resumeInfo.originalName;
    }
  }

  await user.save();

  return {
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
  };
}

export async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }
  return user;
}
