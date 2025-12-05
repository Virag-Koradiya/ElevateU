// tests/job.integration.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";

// Mock Cloudinary FIRST
jest.unstable_mockModule("../utils/cloudinary.js", () => ({
  default: {
    uploader: {
      upload: jest.fn().mockResolvedValue({ secure_url: "mocked-url" }),
    },
  },
}));

// Mock file upload utils (to avoid cloudinary import inside them)
jest.unstable_mockModule("../utils/fileUpload.js", () => ({
  uploadProfilePhoto: jest.fn().mockResolvedValue("mock-photo"),
  uploadResume: jest.fn().mockResolvedValue({ url: "mock-resume", originalName: "resume.pdf" }),
}));

// Mock DB model and job utilities
jest.unstable_mockModule("../models/job.model.js", () => ({
  Job: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/jobUtils.js", () => ({
  parseRequirements: jest.fn(),
  buildJobSearchQuery: jest.fn(),
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
    sign: jest.fn(),
  },
}));

// IMPORTS AFTER MOCKS
const { Job } = await import("../models/job.model.js");
const { parseRequirements } = await import("../utils/jobUtils.js");
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../testApp.js")).default;

let consoleErrorSpy;

describe("JOB integration - POST /api/job/post", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // For all tests here, treat "valid.token" as authenticated with userId=admin123
    jwt.verify.mockImplementation((token, secret) => {
      if (token === "valid.token") {
        return { userId: "admin123", role: "recruiter" };
      }
      throw new Error("Invalid token");
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore(); // 👈 un-mute
  });

  it("creates a job and returns 201 when payload is valid and user is authenticated", async () => {
    const mockJob = {
      _id: "job123",
      title: "Frontend Dev",
      description: "Build UI",
      requirements: ["React", "JS"],
      salary: 800000,
      location: "Remote",
      jobType: "Full-time",
      experienceLevel: 2,
      position: 3,
      company: "company123",
      created_by: "admin123",
    };

    parseRequirements.mockReturnValue(["React", "JS"]);
    Job.create.mockResolvedValue(mockJob);

    const res = await request(app)
      .post("/api/job/post")
      .set("Cookie", "token=valid.token") // isAuthenticated middleware
      .send({
        title: "Frontend Dev",
        description: "Build UI",
        requirements: "React,JS",
        salary: "800000",
        location: "Remote",
        jobType: "Full-time",
        experience: 2,
        position: 3,
        companyId: "company123",
      })
      .expect(201);

    // 1) Requirements parsed
    expect(parseRequirements).toHaveBeenCalledWith("React,JS");

    // 2) Job.create called with proper payload
    expect(Job.create).toHaveBeenCalledTimes(1);
    expect(Job.create).toHaveBeenCalledWith({
      title: "Frontend Dev",
      description: "Build UI",
      requirements: ["React", "JS"],
      salary: 800000,
      location: "Remote",
      jobType: "Full-time",
      experienceLevel: 2,
      position: 3,
      company: "company123",
      created_by: "admin123", // from jwt.verify via isAuthenticated
    });

    // 3) Response body
    expect(res.body).toEqual({
      message: "New job created successfully.",
      job: mockJob,
      success: true,
    });
  });

  it("returns 400 and error body when required fields are missing", async () => {
    // We don't need parseRequirements or Job.create here because validation fails early

    const res = await request(app)
      .post("/api/job/post")
      .set("Cookie", "token=valid.token")
      .send({
        // title missing
        description: "Build UI",
        requirements: "React,JS",
        salary: "800000",
        location: "Remote",
        jobType: "Full-time",
        experience: 2,
        position: 3,
        companyId: "company123",
      })
      .expect(400);

    // errorHandler formats the error
    expect(res.body).toEqual({
      success: false,
      message: "Required fields are missing.",
    });

    expect(Job.create).not.toHaveBeenCalled();
    expect(parseRequirements).not.toHaveBeenCalled();
  });
});
