// tests/loginUser.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock dependencies used inside user.service.js

// Mock User model
jest.unstable_mockModule("../models/user.model.js", () => ({
  User: {
    findOne: jest.fn(),
  },
}));

// Mock bcryptjs
jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

// Mock jsonwebtoken
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
  },
}));

// 🔴 IMPORTANT: Mock fileUpload so it does NOT import real cloudinary.js
jest.unstable_mockModule("../utils/fileUpload.js", () => ({
  uploadProfilePhoto: jest.fn(),
  uploadResume: jest.fn(),
}));

// 2. After mocks are defined, import the real modules (they will receive mocks)
const { User } = await import("../models/user.model.js");
const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const { loginUser } = await import("../services/user.service.js");

describe("loginUser service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 400 if email, password or role is missing", async () => {
    await expect(
      loginUser({ email: "", password: "pass", role: "student" })
    ).rejects.toMatchObject({
      message: "Email, password and role are required.",
      status: 400,
    });

    await expect(
      loginUser({ email: "test@example.com", password: "", role: "student" })
    ).rejects.toMatchObject({
      message: "Email, password and role are required.",
      status: 400,
    });

    await expect(
      loginUser({ email: "test@example.com", password: "pass", role: "" })
    ).rejects.toMatchObject({
      message: "Email, password and role are required.",
      status: 400,
    });

    expect(User.findOne).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("throws 400 if user not found or role mismatch or no password", async () => {
    const invalidCredsMsg = "Incorrect email, password or role.";

    // Case 1: user not found
    User.findOne.mockResolvedValue(null);

    await expect(
      loginUser({ email: "missing@example.com", password: "pass", role: "student" })
    ).rejects.toMatchObject({
      message: invalidCredsMsg,
      status: 400,
    });

    jest.clearAllMocks();

    // Case 2: user found but role mismatch
    User.findOne.mockResolvedValue({
      _id: "user123",
      email: "role@example.com",
      role: "recruiter",
      password: "hashed",
    });

    await expect(
      loginUser({ email: "role@example.com", password: "pass", role: "student" })
    ).rejects.toMatchObject({
      message: invalidCredsMsg,
      status: 400,
    });

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("throws 400 if password does not match", async () => {
    const invalidCredsMsg = "Incorrect email, password or role.";

    User.findOne.mockResolvedValue({
      _id: "user123",
      email: "test@example.com",
      role: "student",
      password: "hashed-password",
      fullname: "Test User",
      phoneNumber: 1234567890,
      profile: {},
    });

    bcrypt.compare.mockResolvedValue(false); // wrong password

    await expect(
      loginUser({ email: "test@example.com", password: "wrongpass", role: "student" })
    ).rejects.toMatchObject({
      message: invalidCredsMsg,
      status: 400,
    });

    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("returns token and safeUser on successful login", async () => {
    const userFromDb = {
      _id: "user123",
      email: "test@example.com",
      role: "student",
      password: "hashed-password",
      fullname: "Test User",
      phoneNumber: 1234567890,
      profile: { skills: ["JS"] },
    };

    User.findOne.mockResolvedValue(userFromDb);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock-jwt-token");

    const result = await loginUser({
      email: " Test@example.com ", // extra spaces & casing
      password: "correct-pass",
      role: "student",
    });

    expect(result).toEqual({
      token: "mock-jwt-token",
      user: {
        _id: userFromDb._id,
        fullname: userFromDb.fullname,
        email: userFromDb.email,
        phoneNumber: userFromDb.phoneNumber,
        role: userFromDb.role,
        profile: userFromDb.profile,
      },
    });

    expect(User.findOne).toHaveBeenCalledWith({
      email: "test@example.com",
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      "correct-pass",
      "hashed-password"
    );

    expect(jwt.sign).toHaveBeenCalledTimes(1);
    const payloadArg = jwt.sign.mock.calls[0][0];
    expect(payloadArg).toEqual({
      userId: userFromDb._id.toString(),
      role: userFromDb.role,
    });
  });
});
