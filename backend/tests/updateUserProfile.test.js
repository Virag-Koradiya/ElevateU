// tests/updateUserProfile.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock dependencies

jest.unstable_mockModule("../models/user.model.js", () => ({
  User: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/fileUpload.js", () => ({
  uploadProfilePhoto: jest.fn(),
  uploadResume: jest.fn(),
}));

jest.unstable_mockModule("../utils/parseSkills.js", () => ({
  parseSkills: jest.fn(),
}));

// 2. Import AFTER mocks

const { User } = await import("../models/user.model.js");
const { uploadResume } = await import("../utils/fileUpload.js");
const { parseSkills } = await import("../utils/parseSkills.js");
const { updateUserProfile } = await import("../services/user.service.js");

describe("updateUserProfile service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 400 if email is not a string", async () => {
    await expect(
      updateUserProfile({
        userId: "user123",
        data: { email: 123 }, // invalid type
        file: null,
      })
    ).rejects.toMatchObject({
      message: "Invalid email.",
      status: 400,
    });

    expect(User.findById).not.toHaveBeenCalled();
    expect(parseSkills).not.toHaveBeenCalled();
    expect(uploadResume).not.toHaveBeenCalled();
  });

  it("throws 404 if user not found", async () => {
    User.findById.mockResolvedValue(null);

    await expect(
      updateUserProfile({
        userId: "missingUser",
        data: { email: "test@example.com" },
        file: null,
      })
    ).rejects.toMatchObject({
      message: "User not found.",
      status: 404,
    });

    expect(User.findById).toHaveBeenCalledWith("missingUser");
  });

  it("throws 409 if new email is already used by another user", async () => {
    const existingUser = {
      _id: "user123",
      email: "old@example.com",
      profile: {},
      save: jest.fn(),
      role: "student",
      fullname: "Old User",
      phoneNumber: 111,
    };

    User.findById.mockResolvedValue(existingUser);

    // Simulate another user with that email
    User.findOne.mockResolvedValue({
      _id: "otherUser",
      email: "new@example.com",
    });

    await expect(
      updateUserProfile({
        userId: "user123",
        data: {
          email: "new@example.com",
        },
        file: null,
      })
    ).rejects.toMatchObject({
      message: "Email already in use by another account.",
      status: 409,
    });

    expect(User.findById).toHaveBeenCalledWith("user123");
    expect(User.findOne).toHaveBeenCalledWith({ email: "new@example.com" });
    expect(existingUser.save).not.toHaveBeenCalled();
  });

  it("updates profile fields, skills and resume on success", async () => {
    const userDoc = {
      _id: "user123",
      fullname: "Old Name",
      email: "old@mail.com",
      phoneNumber: 111,
      role: "student",
      profile: {
        bio: "old bio",
        skills: ["OldSkill"],
        resume: "old.pdf",
        resumeOriginalName: "old.pdf",
      },
      save: jest.fn().mockResolvedValue(),
    };

    User.findById.mockResolvedValue(userDoc);
    User.findOne.mockResolvedValue(null); // no conflicting email
    parseSkills.mockReturnValue(["React", "Node"]);
    uploadResume.mockResolvedValue({
      url: "https://cdn.example.com/resume.pdf",
      originalName: "cv.pdf",
    });

    const result = await updateUserProfile({
      userId: "user123",
      data: {
        fullname: "New Name",
        email: "new@mail.com",
        phoneNumber: 999,
        bio: "new bio",
        skills: "React, Node", // string input
      },
      file: { originalname: "cv.pdf" }, // mock file
    });

    // Email change path
    expect(User.findById).toHaveBeenCalledWith("user123");
    expect(User.findOne).toHaveBeenCalledWith({ email: "new@mail.com" });

    // parseSkills usage
    expect(parseSkills).toHaveBeenCalledWith("React, Node");

    // uploadResume usage
    expect(uploadResume).toHaveBeenCalledTimes(1);

    // Check mutated userDoc fields
    expect(userDoc.fullname).toBe("New Name");
    expect(userDoc.email).toBe("new@mail.com");
    expect(userDoc.phoneNumber).toBe(999);
    expect(userDoc.profile.bio).toBe("new bio");
    expect(userDoc.profile.skills).toEqual(["React", "Node"]);
    expect(userDoc.profile.resume).toBe("https://cdn.example.com/resume.pdf");
    expect(userDoc.profile.resumeOriginalName).toBe("cv.pdf");

    // save should be called
    expect(userDoc.save).toHaveBeenCalledTimes(1);

    // Returned safe user
    expect(result).toEqual({
      _id: userDoc._id,
      fullname: userDoc.fullname,
      email: userDoc.email,
      phoneNumber: userDoc.phoneNumber,
      role: userDoc.role,
      profile: userDoc.profile,
    });
  });

  it("propagates error if uploadResume throws", async () => {
    const userDoc = {
      _id: "user123",
      fullname: "User",
      email: "user@mail.com",
      phoneNumber: 111,
      role: "student",
      profile: {},
      save: jest.fn(),
    };

    User.findById.mockResolvedValue(userDoc);
    User.findOne.mockResolvedValue(null);
    parseSkills.mockReturnValue([]);
    
    const uploadError = new Error("Resume upload failed");
    uploadResume.mockRejectedValue(uploadError);

    await expect(
      updateUserProfile({
        userId: "user123",
        data: { bio: "bio" },
        file: { originalname: "cv.pdf" },
      })
    ).rejects.toThrow("Resume upload failed");

    expect(userDoc.save).not.toHaveBeenCalled();
  });
});
