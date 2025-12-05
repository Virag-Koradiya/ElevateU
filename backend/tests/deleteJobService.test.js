// tests/deleteJobService.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock Job model
jest.unstable_mockModule("../models/job.model.js", () => ({
  Job: {
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  },
}));

// 2. Import AFTER mocks
const { Job } = await import("../models/job.model.js");
const { deleteJobService } = await import("../services/job.service.js");

describe("job.service - deleteJobService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 400 when jobId is missing", async () => {
    await expect(
      deleteJobService({ jobId: "", adminId: "admin123" })
    ).rejects.toMatchObject({
      message: "Job ID is required.",
      status: 400,
    });

    expect(Job.findById).not.toHaveBeenCalled();
    expect(Job.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("throws 401 when adminId is missing", async () => {
    await expect(
      deleteJobService({ jobId: "job123", adminId: "" })
    ).rejects.toMatchObject({
      message: "User ID is required.",
      status: 401,
    });

    expect(Job.findById).not.toHaveBeenCalled();
    expect(Job.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("throws 404 when job is not found", async () => {
    Job.findById.mockResolvedValue(null);

    await expect(
      deleteJobService({ jobId: "job123", adminId: "admin123" })
    ).rejects.toMatchObject({
      message: "Job not found.",
      status: 404,
    });

    expect(Job.findById).toHaveBeenCalledWith("job123");
    expect(Job.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("throws 403 when admin is not the job creator", async () => {
    const jobDoc = {
      _id: "job123",
      created_by: {
        toString: () => "anotherAdmin", // simulate ObjectId.toString()
      },
    };

    Job.findById.mockResolvedValue(jobDoc);

    await expect(
      deleteJobService({ jobId: "job123", adminId: "admin123" })
    ).rejects.toMatchObject({
      message: "You are not authorized to delete this job.",
      status: 403,
    });

    expect(Job.findById).toHaveBeenCalledWith("job123");
    expect(Job.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("deletes job when admin is creator and returns { deleted: true }", async () => {
    const jobDoc = {
      _id: "job123",
      created_by: {
        toString: () => "admin123",
      },
    };

    Job.findById.mockResolvedValue(jobDoc);
    Job.findByIdAndDelete.mockResolvedValue({});

    const result = await deleteJobService({
      jobId: "job123",
      adminId: "admin123",
    });

    expect(Job.findById).toHaveBeenCalledWith("job123");
    expect(Job.findByIdAndDelete).toHaveBeenCalledWith("job123");

    expect(result).toEqual({ deleted: true });
  });
});
