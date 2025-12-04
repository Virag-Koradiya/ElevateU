import {
  applyToJobService,
  getAppliedJobsService,
  getApplicantsService,
  updateStatusService,
} from "../services/application.service.js";

export const applyJob = async (req, res, next) => {
  try {
    const userId = req.id;
    const jobId = req.params.id;

    await applyToJobService({ userId, jobId });

    return res.status(201).json({
      message: "Job applied successfully.",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getAppliedJobs = async (req, res, next) => {
  try {
    const userId = req.id;

    const applications = await getAppliedJobsService({ userId });

    return res.status(200).json({
      applications,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicants = async (req, res, next) => {
  try {
    const jobId = req.params.id;

    const job = await getApplicantsService({ jobId });

    return res.status(200).json({
      job,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const { status } = req.body;

    await updateStatusService({ applicationId, status });

    return res.status(200).json({
      message: "Status updated successfully.",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
