import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";

export async function applyToJobService({ userId, jobId }) {
  if (!jobId) {
    const err = new Error("Job id is required.");
    err.status = 400;
    throw err;
  }

  const existingApplication = await Application.findOne({
    job: jobId,
    applicant: userId,
  });

  if (existingApplication) {
    const err = new Error("You have already applied for this job.");
    err.status = 400;
    throw err;
  }

  const job = await Job.findById(jobId);
  if (!job) {
    const err = new Error("Job not found.");
    err.status = 404;
    throw err;
  }

  const newApplication = await Application.create({
    job: jobId,
    applicant: userId,
  });

  job.applications.push(newApplication._id);
  await job.save();

  return newApplication;
}

export async function getAppliedJobsService({ userId }) {
  if (!userId) {
    const err = new Error("User id is required.");
    err.status = 401;
    throw err;
  }

  const applications = await Application.find({ applicant: userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "job",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "company",
        options: { sort: { createdAt: -1 } },
      },
    });

  if (!applications || applications.length === 0) {
    const err = new Error("No applications found.");
    err.status = 404;
    throw err;
  }

  return applications;
}

export async function getApplicantsService({ jobId }) {
  if (!jobId) {
    const err = new Error("Job id is required.");
    err.status = 400;
    throw err;
  }

  const job = await Job.findById(jobId).populate({
    path: "applications",
    options: { sort: { createdAt: -1 } },
    populate: {
      path: "applicant",
    },
  });

  if (!job) {
    const err = new Error("Job not found.");
    err.status = 404;
    throw err;
  }

  return job;
}

export async function updateStatusService({ applicationId, status }) {
  if (!status) {
    const err = new Error("Status is required.");
    err.status = 400;
    throw err;
  }

  if (!applicationId) {
    const err = new Error("Application id is required.");
    err.status = 400;
    throw err;
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    const err = new Error("Application not found.");
    err.status = 404;
    throw err;
  }

  application.status = String(status).toLowerCase();
  await application.save();

  return application;
}
