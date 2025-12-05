import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule("../models/user.model.js", () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/fileUpload.js", () => ({
  uploadProfilePhoto: jest.fn(),
  uploadResume: jest.fn(),
}));

const { User } = await import("../models/user.model.js");
const bcrypt = (await import("bcryptjs")).default;
const { uploadProfilePhoto } = await import("../utils/fileUpload.js");
const { registerUser } = await import("../services/user.service.js");

describe("registerUser service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 400 when required fields are missing", async () => {

    await expect(
      registerUser({
        fullname: "",
        email: "test@example.com",
        phoneNumber: 123,
        password: "pass",
        role: "student",
      })
    ).rejects.toMatchObject({
      message: "fullname, email, phoneNumber, password and role are required.",
      status: 400,
    });

    await expect(
      registerUser({
        fullname: "Test User",
        email: "",
        phoneNumber: 123,
        password: "pass",
        role: "student",
      })
    ).rejects.toMatchObject({
      message: "fullname, email, phoneNumber, password and role are required.",
      status: 400,
    });

    await expect(
      registerUser({
        fullname: "Test User",
        email: "test@example.com",
        phoneNumber: 123,
        password: "pass",
        role: "",
      })
    ).rejects.toMatchObject({
      message: "fullname, email, phoneNumber, password and role are required.",
      status: 400,
    });

    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("throws 400 if user already exists (findOne)", async () => {
    User.findOne.mockResolvedValue({
      _id: "existingUser",
      email: "test@example.com",
    });

    await expect(
      registerUser({
        fullname: "Test User",
        email: "Test@example.com",
        phoneNumber: 1234567890,
        password: "password123",
        role: "student",
      })
    ).rejects.toMatchObject({
      message: "User already exists with this email.",
      status: 400,
    });

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(User.create).not.toHaveBeenCalled();
  });

  it("throws 502 if profile photo upload fails", async () => {
    User.findOne.mockResolvedValue(null);

    const uploadError = new Error("Cloudinary error");
    uploadProfilePhoto.mockRejectedValue(uploadError);

    await expect(
      registerUser({
        fullname: "Test User",
        email: "test@example.com",
        phoneNumber: 1234567890,
        password: "password123",
        role: "student",
        profileFile: { originalname: "avatar.png" },
      })
    ).rejects.toMatchObject({
      message: "Failed to upload profile photo.",
      status: 502,
    });

    expect(uploadProfilePhoto).toHaveBeenCalledTimes(1);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("throws 409 if Mongo returns duplicate email error on create", async () => {
    User.findOne.mockResolvedValue(null);
    uploadProfilePhoto.mockResolvedValue("https://cdn.example.com/avatar.png");
    bcrypt.hash.mockResolvedValue("hashed-password");

    const dupErr = new Error("Duplicate key");
    dupErr.code = 11000;
    dupErr.keyPattern = { email: 1 };

    User.create.mockRejectedValue(dupErr);

    await expect(
      registerUser({
        fullname: "Test User",
        email: "test@example.com",
        phoneNumber: 1234567890,
        password: "password123",
        role: "student",
        profileFile: { originalname: "avatar.png" },
      })
    ).rejects.toMatchObject({
      message: "User already exists with this email.",
      status: 409,
    });

    expect(User.create).toHaveBeenCalledTimes(1);
  });

  it("creates user and returns safe user on success", async () => {
    User.findOne.mockResolvedValue(null);
    uploadProfilePhoto.mockResolvedValue("https://cdn.example.com/avatar.png");
    bcrypt.hash.mockResolvedValue("hashed-password");

    const createdUser = {
      _id: "newUserId",
      fullname: "Test User",
      email: "test@example.com",
      phoneNumber: 1234567890,
      role: "student",
      profile: { profilePhoto: "https://cdn.example.com/avatar.png" },
      password: "hashed-password",
    };

    User.create.mockResolvedValue(createdUser);

    const result = await registerUser({
      fullname: " Test User ",
      email: "Test@example.com",
      phoneNumber: 1234567890,
      password: "password123",
      role: "student",
      profileFile: { originalname: "avatar.png" },
    });

    expect(result).toEqual({
      _id: createdUser._id,
      fullname: createdUser.fullname,
      email: createdUser.email,
      phoneNumber: createdUser.phoneNumber,
      role: createdUser.role,
      profile: createdUser.profile,
    });

    expect(User.findOne).toHaveBeenCalledWith({
      email: "test@example.com",
    });

    expect(uploadProfilePhoto).toHaveBeenCalledTimes(1);

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);

    expect(User.create).toHaveBeenCalledWith({
      fullname: "Test User",
      email: "test@example.com",
      phoneNumber: 1234567890,
      password: "hashed-password",
      role: "student",
      profile: { profilePhoto: "https://cdn.example.com/avatar.png" },
    });
  });
});
