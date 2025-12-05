// tests/getAllJobsService.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock Job model + jobUtils (even if not used directly)
jest.unstable_mockModule("../models/job.model.js", () => ({
  Job: {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/jobUtils.js", () => ({
  parseRequirements: jest.fn(),
  buildJobSearchQuery: jest.fn(), // imported but not used; we define it to be safe
}));

// 2. Import AFTER mocks
const { Job } = await import("../models/job.model.js");
const { getAllJobsService } = await import("../services/job.service.js");

describe("job.service - getAllJobsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupFindChain(jobsResult) {
    // sort() resolves to jobsResult
    const sortMock = jest.fn().mockResolvedValue(jobsResult);

    // populate() returns an object with sort()
    const populateMock = jest.fn().mockReturnValue({
      sort: sortMock,
    });

    // Job.find() returns an object with populate()
    Job.find.mockReturnValue({
      populate: populateMock,
    });

    return { populateMock, sortMock };
  }

  it("returns jobs when found and keyword is empty (query {})", async () => {
    const mockJobs = [
      { _id: "job1", title: "Frontend Dev" },
      { _id: "job2", title: "Backend Dev" },
    ];

    const { populateMock, sortMock } = setupFindChain(mockJobs);

    const result = await getAllJobsService({ keyword: "" });

    // 1) Job.find called with empty query
    expect(Job.find).toHaveBeenCalledWith({});

    // 2) populate + sort called correctly
    expect(populateMock).toHaveBeenCalledWith({ path: "company" });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });

    // 3) result is the jobs array
    expect(result).toBe(mockJobs);
  });

  it("builds a regex $or query when keyword is provided", async () => {
    const mockJobs = [{ _id: "job1", title: "Dev" }];

    const { populateMock, sortMock } = setupFindChain(mockJobs);

    const result = await getAllJobsService({ keyword: "  dev  " });

    // 1) Check query passed to Job.find
    const queryArg = Job.find.mock.calls[0][0];
    expect(queryArg).toEqual({
      $or: [
        { title: { $regex: "dev", $options: "i" } },
        { description: { $regex: "dev", $options: "i" } },
      ],
    });

    // 2) populate + sort called
    expect(populateMock).toHaveBeenCalledWith({ path: "company" });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });

    // 3) Returns jobs
    expect(result).toBe(mockJobs);
  });

  it("throws 404 when jobs array is empty", async () => {
    setupFindChain([]); // jobs = []

    await expect(
      getAllJobsService({ keyword: "" })
    ).rejects.toMatchObject({
      message: "No jobs found.",
      status: 404,
    });

    expect(Job.find).toHaveBeenCalledWith({});
  });

  it("throws 404 when jobs is null/undefined", async () => {
    setupFindChain(null); // jobs = null

    await expect(
      getAllJobsService({ keyword: "dev" })
    ).rejects.toMatchObject({
      message: "No jobs found.",
      status: 404,
    });

    // still expect Job.find called with a $or query
    const queryArg = Job.find.mock.calls[0][0];
    expect(queryArg).toEqual({
      $or: [
        { title: { $regex: "dev", $options: "i" } },
        { description: { $regex: "dev", $options: "i" } },
      ],
    });
  });
});
