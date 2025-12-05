// tests/authUpdateProfile.controller.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock user.service
jest.unstable_mockModule("../services/user.service.js", () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  updateUserProfile: jest.fn(),
  getUserById: jest.fn(),
}));

// 2. Import AFTER mocks
const userService = await import("../services/user.service.js");
const { updateProfile } = await import("../controllers/auth.controller.js");

describe("auth.controller - updateProfile", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      id: "user123",
      body: {
        fullname: "New Name",
        email: "new@example.com",
        phoneNumber: 9999999999,
        bio: "New bio",
        skills: "React,Node",
      },
      file: undefined, // default: no file
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  it("should call updateUserProfile with correct args and return 200 on success (no file)", async () => {
    const mockUser = {
      _id: "user123",
      fullname: "New Name",
      email: "new@example.com",
      phoneNumber: 9999999999,
      role: "student",
      profile: {
        bio: "New bio",
        skills: ["React", "Node"],
      },
    };

    userService.updateUserProfile.mockResolvedValue(mockUser);

    await updateProfile(req, res, next);

    // 1) Service called with proper payload
    expect(userService.updateUserProfile).toHaveBeenCalledTimes(1);
    expect(userService.updateUserProfile).toHaveBeenCalledWith({
      userId: "user123",
      data: req.body,
      file: undefined,
    });

    // 2) Correct response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Profile updated successfully.",
      user: mockUser,
    });

    // 3) No error forwarded
    expect(next).not.toHaveBeenCalled();
  });

  it("should pass file to updateUserProfile when file is present", async () => {
    const mockUser = {
      _id: "user123",
      fullname: "New Name",
      email: "new@example.com",
      phoneNumber: 9999999999,
      role: "student",
      profile: {
        bio: "New bio",
        skills: ["React", "Node"],
        resume: "https://cdn.example.com/resume.pdf",
      },
    };

    const mockFile = {
      originalname: "resume.pdf",
      mimetype: "application/pdf",
      size: 12345,
    };

    req.file = mockFile;

    userService.updateUserProfile.mockResolvedValue(mockUser);

    await updateProfile(req, res, next);

    // Service must receive file
    expect(userService.updateUserProfile).toHaveBeenCalledWith({
      userId: "user123",
      data: req.body,
      file: mockFile,
    });

    // Response OK
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Profile updated successfully.",
      user: mockUser,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) when updateUserProfile throws (e.g. user not found)", async () => {
    const error = new Error("User not found.");
    error.status = 404;

    userService.updateUserProfile.mockRejectedValue(error);

    await updateProfile(req, res, next);

    // No response should be sent on error
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // Error forwarded
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  it("should still forward errors when req.id is missing", async () => {
    const error = new Error("User not found.");
    error.status = 404;

    // simulate missing id (e.g. auth middleware not run)
    req.id = undefined;

    userService.updateUserProfile.mockRejectedValue(error);

    await updateProfile(req, res, next);

    // Controller passes undefined to service; we don't validate here
    expect(userService.updateUserProfile).toHaveBeenCalledWith({
      userId: undefined,
      data: req.body,
      file: req.file,
    });

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
