// tests/createJob.service.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock Job model + jobUtils
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

// 2. Import AFTER mocks
const { Job } = await import("../models/job.model.js");
const { parseRequirements } = await import("../utils/jobUtils.js");
const { createJob } = await import("../services/job.service.js");

describe("job.service - createJob", () => {
  let baseInput;

  beforeEach(() => {
    jest.clearAllMocks();

    baseInput = {
      title: "Frontend Developer",
      description: "Build UI features",
      requirements: "React, JavaScript",
      salary: "800000",
      location: "Remote",
      jobType: "Full-time",
      experience: 2,
      position: 3,
      companyId: "company123",
      userId: "admin123",
    };
  });

  it("throws 400 when any required field is missing", async () => {
    // Example: missing title
    const input = { ...baseInput, title: "" };

    await expect(createJob(input)).rejects.toMatchObject({
      message: "Required fields are missing.",
      status: 400,
    });

    // Another example: missing companyId
    const input2 = { ...baseInput, companyId: "" };

    await expect(createJob(input2)).rejects.toMatchObject({
      message: "Required fields are missing.",
      status: 400,
    });

    expect(parseRequirements).not.toHaveBeenCalled();
    expect(Job.create).not.toHaveBeenCalled();
  });

  it("throws 400 if salary is not a valid positive number (NaN)", async () => {
    const input = { ...baseInput, salary: "abc" };

    parseRequirements.mockReturnValue(["React", "JavaScript"]);

    await expect(createJob(input)).rejects.toMatchObject({
      message: "Salary must be a valid positive number.",
      status: 400,
    });

    expect(parseRequirements).toHaveBeenCalledTimes(1);
    expect(Job.create).not.toHaveBeenCalled();
  });

  it("throws 400 if salary is zero or negative", async () => {
    const inputZero = { ...baseInput, salary: "0" };
    const inputNegative = { ...baseInput, salary: "-1000" };

    parseRequirements.mockReturnValue(["React", "JavaScript"]);

    await expect(createJob(inputZero)).rejects.toMatchObject({
      message: "Salary must be a valid positive number.",
      status: 400,
    });

    await expect(createJob(inputNegative)).rejects.toMatchObject({
      message: "Salary must be a valid positive number.",
      status: 400,
    });

    // salaryNumber validation fails; Job.create never called
    expect(Job.create).not.toHaveBeenCalled();
  });

  it("parses requirements, converts salary to number, and creates job on success", async () => {
    parseRequirements.mockReturnValue(["React", "JavaScript"]);

    const mockJob = {
      _id: "job123",
      title: baseInput.title,
      description: baseInput.description,
      requirements: ["React", "JavaScript"],
      salary: 800000,
      location: baseInput.location,
      jobType: baseInput.jobType,
      experienceLevel: baseInput.experience,
      position: baseInput.position,
      company: baseInput.companyId,
      created_by: baseInput.userId,
    };

    Job.create.mockResolvedValue(mockJob);

    const result = await createJob(baseInput);

    // 1) parseRequirements called correctly
    expect(parseRequirements).toHaveBeenCalledTimes(1);
    expect(parseRequirements).toHaveBeenCalledWith(baseInput.requirements);

    // 2) Job.create called with transformed payload
    expect(Job.create).toHaveBeenCalledTimes(1);
    expect(Job.create).toHaveBeenCalledWith({
      title: baseInput.title,
      description: baseInput.description,
      requirements: ["React", "JavaScript"],
      salary: 800000, // converted to Number
      location: baseInput.location,
      jobType: baseInput.jobType,
      experienceLevel: baseInput.experience,
      position: baseInput.position,
      company: baseInput.companyId,
      created_by: baseInput.userId,
    });

    // 3) Returned job is whatever Job.create resolved to
    expect(result).toBe(mockJob);
  });
});
