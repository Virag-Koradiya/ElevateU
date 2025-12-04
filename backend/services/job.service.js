import { Job } from "../models/job.model.js";
import { parseRequirements, buildJobSearchQuery } from "../utils/jobUtils.js";

export async function createJob({
  title,
  description,
  requirements,
  salary,
  location,
  jobType,
  experience,
  position,
  companyId,
  userId,
}) {

    if (
    !title ||
    !description ||
    !requirements ||
    !salary ||
    !location ||
    !jobType ||
    !experience ||
    !position ||
    !companyId
  ) {
    const err = new Error("Required fields are missing.");
    err.status = 400;
    throw err;
  }

  const parsedRequirements = parseRequirements(requirements);
  const salaryNumber = Number(salary);
  if (Number.isNaN(salaryNumber) || salaryNumber <= 0) {
    const err = new Error("Salary must be a valid positive number.");
    err.status = 400;
    throw err;
  }

  const job = await Job.create({
    title,
    description,
    requirements: parsedRequirements,
    salary: salaryNumber,
    location,
    jobType,
    experienceLevel: experience,
    position,
    company: companyId,
    created_by: userId,
  });

  return job;
}

export async function getAllJobsService({ keyword }) {
  const query = buildQuery(keyword);
  const jobs = await Job.find(query).populate({ path: "company" }).sort({ createdAt: -1 });

  if (!jobs || jobs.length === 0) {
    const err = new Error("No jobs found.");
    err.status = 404;
    throw err;
  }

  return jobs;
}

function buildQuery(keyword = "") {
  const normalized = String(keyword).trim();
  if (!normalized) {
    return {};
  }
  return {
    $or: [
      { title: { $regex: normalized, $options: "i" } },
      { description: { $regex: normalized, $options: "i" } },
    ],
  };
}

export async function getJobByIdService(jobId) {
  if (!jobId) {
    const err = new Error("Job ID is required.");
    err.status = 400;
    throw err;
  }

  const job = await Job.findById(jobId).populate({ path: "applications" });

  if (!job) {
    const err = new Error("Job not found.");
    err.status = 404;
    throw err;
  }

  return job;
}

export async function getAdminJobsService(adminId) {
  if (!adminId) {
    const err = new Error("Admin ID is required.");
    err.status = 400;
    throw err;
  }

  const jobs = await Job.find({ created_by: adminId })
    .populate({ path: "company" })
    .sort({ groom: -1 });

  if (!jobs || jobs.length === 0) {
    const err = new Error("No jobs found for this admin.");
    err.status = 404;
    throw err;
  }

  return jobs;
}

export async function deleteJobService({ jobId, adminId }) {
  if (!jobId) {
    const err = new Error("Job ID is required.");
    err.status = 400;
    throw err;
  }
  if (!adminId) {
    const err = new Error("User ID is required.");
    err.status = 401;
    throw err;
  }

  const job = await Job.findById(jobId);
  if (!job) {
    const err = new Error("Job not found.");
    err.status = 404;
    throw err;
  }

  if (job.created_by.toString() !== adminId.toString()) {
    const err = new Error("You are not authorized to delete this job.");
    err.status = 403;
    throw err;
  }

  await Job.findByIdAndDelete(jobId);

  return { deleted: true };
}
