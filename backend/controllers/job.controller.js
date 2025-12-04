import {
  createJob,
  getAllJobsService,
  getJobByIdService,
  getAdminJobsService,
  deleteJobService,
} from "../services/job.service.js";

// POST /api/jobs
export const postJob = async (req, res, next) => {
  try {
    const job = await createJob({
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

    return res.status(201).json({
      message: "New job created successfully.",
      job,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/jobs?keyword=...
export const getAllJobs = async (req, res, next) => {
  try {
    const keyword = req.query.keyword || "";
    const jobs = await getAllJobsService({ keyword });

    return res.status(200).json({
      jobs,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/jobs/:id
export const getJobById = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const job = await getJobByIdService(jobId);

    return res.status(200).json({ job, success: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/jobs
export const getAdminJobs = async (req, res, next) => {
  try {
    const adminId = req.id;
    const jobs = await getAdminJobsService(adminId);

    return res.status(200).json({
      jobs,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/jobs/:id
export const deleteJob = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const adminId = req.id;

    await deleteJobService({ jobId, adminId });

    return res.status(200).json({
      message: "Job deleted successfully.",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
