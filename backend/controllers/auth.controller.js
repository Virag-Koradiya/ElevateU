import { registerUser, loginUser, updateUserProfile, getUserById } from "../services/user.service.js";

const makeCookieOptions = (maxAgeMs = 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: maxAgeMs,
});

// REGISTER
export const register = async (req, res, next) => {
  try {
    const user = await registerUser({
      fullname: req.body.fullname,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      password: req.body.password,
      role: req.body.role,
      profileFile: req.file,
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// LOGIN
export const login = async (req, res, next) => {
  try {
    const { token, user } = await loginUser({
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
    });

    return res
      .status(200)
      .cookie("token", token, makeCookieOptions(24 * 60 * 60 * 1000))
      .json({
        message: `Welcome back ${user.fullname || ""}`.trim(),
        user,
        success: true,
      });
  } catch (error) {
    next(error);
  }
};

// LOGOUT
export const logout = async (req, res, next) => {
  try {
    return res
      .status(200)
      .cookie("token", "", { ...makeCookieOptions(0), expires: new Date(0) })
      .json({ message: "Logged out successfully.", success: true });
  } catch (error) {
    next(error);
  }
};

// UPDATE PROFILE
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.id;

    const user = await updateUserProfile({
      userId,
      data: req.body,
      file: req.file,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// RENDER USER INFO PAGE
export const renderUserInfoPage = async (req, res, next) => {
  try {
    const userId = req.id;

    if (!userId) {
      return res.status(401).send("Unauthorized. Please log in first.");
    }

    const user = await getUserById(userId);

    return res.render("user-info", { user });
  } catch (error) {
    next(error);
  }
};
