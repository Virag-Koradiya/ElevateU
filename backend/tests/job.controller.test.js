// tests/job.controller.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock job.service module
jest.unstable_mockModule("../services/job.service.js", () => ({
  createJob: jest.fn(),
  getAllJobsService: jest.fn(),
  getJobByIdService: jest.fn(),
  getAdminJobsService: jest.fn(),
  deleteJobService: jest.fn(),
}));

// 2. Import AFTER mocks
const jobService = await import("../services/job.service.js");
const {
  postJob,
  getAllJobs,
  getJobById,
  getAdminJobs,
  deleteJob,
} = await import("../controllers/job.controller.js");

describe("job.controller - postJob", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      id: "admin123",
      body: {
        title: "Frontend Dev",
        description: "Build UI",
        requirements: "React, JS",
        salary: "800000",
        location: "Remote",
        jobType: "Full-time",
        experience: 2,
        position: 3,
        companyId: "company123",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should call createJob with correct payload and return 201 on success", async () => {
    const mockJob = { _id: "job123", title: "Frontend Dev" };
    jobService.createJob.mockResolvedValue(mockJob);

    await postJob(req, res, next);

    expect(jobService.createJob).toHaveBeenCalledTimes(1);
    expect(jobService.createJob).toHaveBeenCalledWith({
      title: req.body.title,
      description: req.body.description,
      requirements: req.body.requirements,
      salary: req.body.salary,
      location: req.body.location,
      jobType: req.body.jobType,
      experience: req.body.experience,
      position: req.body.position,
      companyId: req.body.companyId,
      userId: req.id,
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "New job created successfully.",
      job: mockJob,
      success: true,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) when createJob throws", async () => {
    const error = new Error("Validation error");
    error.status = 400;
    jobService.createJob.mockRejectedValue(error);

    await postJob(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("job.controller - getAllJobs", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should default keyword to empty string when not provided and return jobs", async () => {
    const mockJobs = [{ _id: "job1" }, { _id: "job2" }];
    jobService.getAllJobsService.mockResolvedValue(mockJobs);

    await getAllJobs(req, res, next);

    expect(jobService.getAllJobsService).toHaveBeenCalledWith({ keyword: "" });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      jobs: mockJobs,
      success: true,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("should pass keyword from query and return jobs", async () => {
    const mockJobs = [{ _id: "job1" }];
    req.query.keyword = "dev";

    jobService.getAllJobsService.mockResolvedValue(mockJobs);

    await getAllJobs(req, res, next);

    expect(jobService.getAllJobsService).toHaveBeenCalledWith({ keyword: "dev" });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      jobs: mockJobs,
      success: true,
    });
  });

  it("should call next(error) when getAllJobsService throws", async () => {
    const error = new Error("No jobs found.");
    error.status = 404;
    jobService.getAllJobsService.mockRejectedValue(error);

    await getAllJobs(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("job.controller - getJobById", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: { id: "job123" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should call getJobByIdService with ID and return job", async () => {
    const mockJob = { _id: "job123", title: "Frontend Dev" };
    jobService.getJobByIdService.mockResolvedValue(mockJob);

    await getJobById(req, res, next);

    expect(jobService.getJobByIdService).toHaveBeenCalledWith("job123");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      job: mockJob,
      success: true,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) when getJobByIdService throws", async () => {
    const error = new Error("Job not found.");
    error.status = 404;
    jobService.getJobByIdService.mockRejectedValue(error);

    await getJobById(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("job.controller - getAdminJobs", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      id: "admin123",
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should call getAdminJobsService with adminId and return jobs", async () => {
    const mockJobs = [{ _id: "job1" }, { _id: "job2" }];

    jobService.getAdminJobsService.mockResolvedValue(mockJobs);

    await getAdminJobs(req, res, next);

    expect(jobService.getAdminJobsService).toHaveBeenCalledWith("admin123");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      jobs: mockJobs,
      success: true,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) when getAdminJobsService throws", async () => {
    const error = new Error("No jobs found for this admin.");
    error.status = 404;

    jobService.getAdminJobsService.mockRejectedValue(error);

    await getAdminJobs(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("job.controller - deleteJob", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: { id: "job123" },
      id: "admin123",
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should call deleteJobService and return 200 on success", async () => {
    jobService.deleteJobService.mockResolvedValue({ deleted: true });

    await deleteJob(req, res, next);

    expect(jobService.deleteJobService).toHaveBeenCalledWith({
      jobId: "job123",
      adminId: "admin123",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Job deleted successfully.",
      success: true,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) when deleteJobService throws", async () => {
    const error = new Error("You are not authorized to delete this job.");
    error.status = 403;

    jobService.deleteJobService.mockRejectedValue(error);

    await deleteJob(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
