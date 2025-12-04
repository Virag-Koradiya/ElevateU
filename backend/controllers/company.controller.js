import {
  registerCompanyService,
  getUserCompaniesService,
  getCompanyByIdService,
  updateCompanyService,
} from "../services/company.service.js";

// POST /api/company
export const registerCompany = async (req, res, next) => {
  try {
    const company = await registerCompanyService({
      companyName: req.body.companyName,
      userId: req.id,
    });

    return res.status(201).json({
      message: "Company registered successfully.",
      company,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/company (all companies of logged-in user)
export const getCompany = async (req, res, next) => {
  try {
    const userId = req.id;

    const companies = await getUserCompaniesService(userId);

    return res.status(200).json({
      companies,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/company/:id
export const getCompanyById = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const company = await getCompanyByIdService(companyId);

    return res.status(200).json({
      company,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/company/:id
export const updateCompany = async (req, res, next) => {
  try {
    const companyId = req.params.id;

    const company = await updateCompanyService({
      companyId,
      data: req.body,
      file: req.file,
    });

    return res.status(200).json({
      message: "Company information updated.",
      company,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
