import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

const makeCookieOptions = (maxAgeMs = 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // if cross-site in prod, use 'none'
  maxAge: maxAgeMs,
});

export const register = async (req, res) => {
    try {
        let { fullname, email, phoneNumber, password, role } = req.body;
         
        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        email = String(email).trim().toLowerCase();

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists with this email.",
                success: false,
            });
        }

        let profilePhotoUrl = "";
        if (req.file) {
            try {
                const fileUri = getDataUri(req.file);
                const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
                profilePhotoUrl = cloudResponse.secure_url;
            } catch (err) {
                console.error('Cloudinary upload failed:', err);
                return res.status(502).json({ message: 'Failed to upload profile photo.', success: false });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let newUser;
        try {
            newUser = await User.create({
                fullname: String(fullname).trim(),
                email,
                phoneNumber,
                password: hashedPassword,
                role,
                profile: { profilePhoto: profilePhotoUrl },
            });
        } catch (createErr) {
            if (createErr.code === 11000 && createErr.keyPattern && createErr.keyPattern.email) {
                return res.status(409).json({ message: 'User already exists with this email.', success: false });
            }
            throw createErr;
        }

        return res.status(201).json({ message: "Account created successfully.", user: {
            _id: newUser._id,
            fullname: newUser.fullname,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
            role: newUser.role,
            profile: newUser.profile
        }, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const login = async (req, res) => {
  try {
    let { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: 'Email, password and role are required.',
        success: false,
      });
    }

    email = String(email).trim().toLowerCase();
    role = String(role).trim();

    const user = await User.findOne({ email });
    const invalidCredsMsg = 'Incorrect email, password or role.';

    if (!user) {
      return res.status(400).json({ message: invalidCredsMsg, success: false });
    }

    if (user.role !== role) {
      return res.status(400).json({ message: invalidCredsMsg, success: false });
    }

    if (!user.password) {
      return res.status(400).json({ message: invalidCredsMsg, success: false });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: invalidCredsMsg, success: false });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, process.env.SECRET_KEY, { expiresIn: '1d' });

    // Prepare sanitized user object
    const safeUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    // Set cookie and respond
    return res
      .status(200)
      .cookie('token', token, makeCookieOptions(24 * 60 * 60 * 1000)) // 1 day
      .json({
        message: `Welcome back ${safeUser.fullname || ''}`.trim(),
        user: safeUser,
        success: true,
      });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      success: false,
    });
  }
};


export const logout = async (req, res) => {
  try {
    return res
      .status(200)
      .cookie('token', '', { ...makeCookieOptions(0), expires: new Date(0) })
      .json({ message: 'Logged out successfully.', success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Logout failed.', success: false });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, bio, skills } = req.body;
    const file = req.file;
    const userId = req.id;

    if (email && typeof email !== 'string') {
      return res.status(400).json({ success:false, message: 'Invalid email.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success:false, message: 'User not found.' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success:false, message: 'Email already in use by another account.' });
      }
    }

    if (!user.profile) user.profile = {};

    let skillsArray;
    if (skills) {
      if (Array.isArray(skills)) {
        skillsArray = skills.map(s => String(s).trim()).filter(Boolean);
      } else {
        skillsArray = String(skills)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }
    }

    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bio) user.profile.bio = bio;
    if (skillsArray) user.profile.skills = skillsArray;

    if (file) {
      const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxBytes = 5 * 1024 * 1024;
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ success:false, message: 'Unsupported resume file type.' });
      }
      if (file.size > maxBytes) {
        return res.status(400).json({ success:false, message: 'Resume file too large (max 5MB).' });
      }

      const fileUri = getDataUri(file);
      let cloudResponse;
      try {
        cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
          folder: 'resumes',
          resource_type: 'auto',
        });
      } catch (uErr) {
        console.error('Cloud upload failed', uErr);
        return res.status(502).json({ success:false, message: 'Failed to upload resume. Try again later.' });
      }

      if (cloudResponse && cloudResponse.secure_url) {
        user.profile.resume = cloudResponse.secure_url;
        user.profile.resumeOriginalName = file.originalname;
      }
    }

    await user.save();

    const safeUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res.status(200).json({ success: true, message: 'Profile updated successfully.', user: safeUser });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success:false, message: 'Internal server error.' });
  }
};

export const renderUserInfoPage = async (req, res) => {
  try {
    const userId = req.id; // set by isAuthenticated middleware

    if (!userId) {
      return res.status(401).send("Unauthorized. Please log in first.");
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found.");
    }

    // Render EJS view and pass user
    return res.render("user-info", { user });
  } catch (error) {
    console.error("renderUserInfoPage error:", error);
    return res.status(500).send("Internal server error.");
  }
};