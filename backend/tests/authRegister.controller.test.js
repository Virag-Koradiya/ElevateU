// tests/authRegister.controller.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock the user.service module
jest.unstable_mockModule("../services/user.service.js", () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  updateUserProfile: jest.fn(),
  getUserById: jest.fn(),
}));

// 2. Import AFTER mocks
const userService = await import("../services/user.service.js");
const { register } = await import("../controllers/auth.controller.js");

describe("auth.controller - register", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {
        fullname: "Test User",
        email: "test@example.com",
        phoneNumber: 1234567890,
        password: "password123",
        role: "student",
      },
      file: {
        originalname: "avatar.png",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  it("should call registerUser with correct data and return 201 with response body", async () => {
    const mockUser = {
      _id: "newUserId",
      fullname: "Test User",
      email: "test@example.com",
      phoneNumber: 1234567890,
      role: "student",
      profile: { profilePhoto: "https://cdn.example.com/avatar.png" },
    };

    userService.registerUser.mockResolvedValue(mockUser);

    await register(req, res, next);

    // 1) Service should be called with proper payload
    expect(userService.registerUser).toHaveBeenCalledTimes(1);
    expect(userService.registerUser).toHaveBeenCalledWith({
      fullname: req.body.fullname,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      password: req.body.password,
      role: req.body.role,
      profileFile: req.file,
    });

    // 2) Response should be correct
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Account created successfully.",
      user: mockUser,
      success: true,
    });

    // 3) No error forwarded
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) when registerUser throws", async () => {
    const error = new Error("Something went wrong");
    error.status = 500;

    userService.registerUser.mockRejectedValue(error);

    await register(req, res, next);

    // No response should be sent when error is thrown
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // Error should be forwarded to errorHandler
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });
});
