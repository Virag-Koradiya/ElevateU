import { Company } from "../models/company.model.js";
import { uploadProfilePhoto } from "../utils/fileUpload.js"; // we created this earlier

export async function registerCompanyService({ companyName, userId }) {
  if (!companyName) {
    const err = new Error("Company name is required.");
    err.status = 400;
    throw err;
  }

  const existing = await Company.findOne({ name: companyName });
  if (existing) {
    const err = new Error("You can't register same company.");
    err.status = 400;
    throw err;
  }

  const company = await Company.create({
    name: companyName,
    userId,
  });

  return company;
}

export async function getUserCompaniesService(userId) {
  if (!userId) {
    const err = new Error("User id is required.");
    err.status = 401;
    throw err;
  }

  const companies = await Company.find({ userId });

  if (!companies || companies.length === 0) {
    const err = new Error("Companies not found.");
    err.status = 404;
    throw err;
  }

  return companies;
}

export async function getCompanyByIdService(companyId) {
  if (!companyId) {
    const err = new Error("Company id is required.");
    err.status = 400;
    throw err;
  }

  const company = await Company.findById(companyId);
  if (!company) {
    const err = new Error("Company not found.");
    err.status = 404;
    throw err;
  }

  return company;
}

export async function updateCompanyService({ companyId, data, file }) {
  if (!companyId) {
    const err = new Error("Company id is required.");
    err.status = 400;
    throw err;
  }

  const { name, description, website, location } = data || {};

  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (website !== undefined) updateData.website = website;
  if (location !== undefined) updateData.location = location;

  if (file) {
    try {
      const logoUrl = await uploadProfilePhoto(file); 
      updateData.logo = logoUrl;
    } catch (e) {
      const err = new Error("Failed to upload logo.");
      err.status = 502;
      throw err;
    }
  }

  const company = await Company.findByIdAndUpdate(companyId, updateData, { new: true });

  if (!company) {
    const err = new Error("Company not found.");
    err.status = 404;
    throw err;
  }

  return company;
}
