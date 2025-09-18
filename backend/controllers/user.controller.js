import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

const validateFields = (fields, requiredKeys) => {
  for (let key of requiredKeys) {
    if (!fields[key]) {
      return `Missing required field: ${key}`;
    }
  }
  return null;
};

const uploadProfilePhoto = async (file) => {
  if (!file) return "";
  const fileUri = getDataUri(file);
  const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
  return cloudResponse.secure_url;
};

export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: "1d" });
};


export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, role } = req.body;

    const error = validateFields(req.body, [
      "fullname",
      "email",
      "phoneNumber",
      "password",
      "role",
    ]);
    if (error) {
      return res.status(400).json({ message: error, success: false });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email.", success: false });
    }

    const profilePhotoUrl = await uploadProfilePhoto(req.file);

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullname,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      profile: { profilePhoto: profilePhotoUrl },
    });

    return res.status(201).json({
      message: "Account created successfully.",
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const error = validateFields(req.body, ["email", "password", "role"]);
    if (error) {
      return res.status(400).json({ message: error, success: false });
    }

    let user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Incorrect email or password.", success: false });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res
        .status(400)
        .json({ message: "Incorrect email or password.", success: false });
    }

    if (role !== user.role) {
      return res.status(400).json({
        message: "Account doesn't exist with current role.",
        success: false,
      });
    }

    const token = generateToken(user._id);

    user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
      })
      .json({
        message: `Welcome back ${user.fullname}`,
        user,
        success: true,
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};
