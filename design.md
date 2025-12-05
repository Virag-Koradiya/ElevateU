# Design Document

## 1. System Overview

This project is a full-stack job portal application with:

- **Backend**: Node.js, Express, MongoDB (Mongoose), organized using **MVC** + services + utilities.
- **Frontend**: React with a modular folder structure: `components/`, `hooks/`, `lib/`, `redux/`, `utils/`.

The main goals of the design and subsequent refactoring were:

- Improve **separation of concerns**.
- Reduce **duplication** and **tight coupling**.
- Make the codebase **maintainable**, **testable**, and easier to extend.
- Explicitly apply principles like **SOLID**, **Encapsulate What Varies**, **DRY**, and **Hollywood Principle**.

---

## 2. Backend Architecture

### 2.1 Overall Structure

Backend folders:

- `models/` – Mongoose models: `User`, `Job`, `Company`, `Application`, etc.
- `controllers/` – Express controllers handling HTTP-level concerns.
- `services/` – Business logic for users and jobs (newly introduced).
- `utils/` – Cross-cutting helpers:
  - `db.js` (DB connection)
  - `cloudinary.js` (Cloudinary config)
  - `datauri.js` (file → data URI)
  - `parseSkills.js`
  - `fileUpload.js`
  - `jobUtils.js`
- `middlewares/` – `errorHandler.js`, auth middleware, etc.
- `routes/` – Express route modules wiring URLs to controllers.

This follows a **layered architecture**:

> Controller → Service → Model/Utils

Controllers are now thin:
- Read `req`
- Call a service
- Send HTTP response
- Delegate errors to `errorHandler`.

Services encapsulate:
- Business rules
- Data validation
- Model operations
- Integration with utils.

---

## 3. Centralized Error Handling

### 3.1 Problem (Before)

Originally, controllers handled errors individually:

```js
export const login = async (req, res) => {
  try {
    // ... logic ...
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      success: false,
    });
  }
};
````

Issues:

* **Duplicated** `try/catch` + `console.error` logic everywhere.
* Some controllers logged errors but **never returned** proper responses.
* Inconsistent error response format.

### 3.2 Refactoring (After)

#### 3.2.1 Global Error Handler

```js
// middlewares/errorHandler.js

export function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  const status = err.status || 500;
  const message = err.message || "Internal server error";

  return res.status(status).json({
    success: false,
    message,
  });
}
```

Registered as the **last middleware**:

```js
// app.js / server.js

import { errorHandler } from "./middlewares/errorHandler.js";

// routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
// ... other routes ...

// last
app.use(errorHandler);
```

#### 3.2.2 Controller Change

Controllers now delegate unexpected errors:

```js
export const login = async (req, res, next) => {
  try {
    // ... main logic ...
  } catch (error) {
    next(error); // let errorHandler format the response
  }
};
```

### 3.3 Principles Applied

* **Hollywood Principle** – “Don’t call us, we’ll call you”
  Express calls `errorHandler` whenever there’s an error.
* **SRP** – Controllers now *only* handle HTTP flow; error formatting is centralized.
* **DRY** – Removed repeated `res.status(500).json(...)` code.

---

## 4. Auth / User Module Refactoring

Refactored: `user.controller.js` (auth-related controller) + `user.service.js` + utils.

### 4.1 Problem (Before): Fat Controller

Earlier, controller functions handled **everything**: validation, business logic, DB, Cloudinary, parsing, response.

#### Example: `updateProfile` **before** (simplified)

```js
export const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, bio, skills } = req.body;
    const file = req.file;
    const userId = req.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let skillsArray;
    if (skills) {
      if (Array.isArray(skills)) {
        skillsArray = skills.map(s => String(s).trim()).filter(Boolean);
      } else {
        skillsArray = String(skills)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }
      user.profile.skills = skillsArray;
    }

    if (file) {
      const allowedMimes = ['application/pdf', 'application/msword'];
      const maxBytes = 5 * 1024 * 1024;
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ success: false, message: 'Unsupported resume file type.' });
      }
      if (file.size > maxBytes) {
        return res.status(400).json({ success: false, message: 'Resume file too large (max 5MB).' });
      }

      const fileUri = getDataUri(file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
        folder: 'resumes',
        resource_type: 'auto',
      });
      user.profile.resume = cloudResponse.secure_url;
      user.profile.resumeOriginalName = file.originalname;
    }

    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bio) user.profile.bio = bio;

    await user.save();

    return res.status(200).json({ success: true, message: 'Profile updated successfully.', user });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success:false, message: 'Internal server error.' });
  }
};
```

Issues:

* Controller mixing **business logic + persistence + Cloudinary + parsing**.
* Hard to test and maintain.
* Violates **SRP** and **Encapsulate What Varies**.

---

### 4.2 New Utilities

#### 4.2.1 `utils/parseSkills.js`

```js
// utils/parseSkills.js
export function parseSkills(skillsInput) {
  if (!skillsInput) return [];

  if (Array.isArray(skillsInput)) {
    return skillsInput.map(s => String(s).trim()).filter(Boolean);
  }

  return String(skillsInput)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
```

#### 4.2.2 `utils/fileUpload.js`

```js
// utils/fileUpload.js
import getDataUri from "./datauri.js";
import cloudinary from "./cloudinary.js";

const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadProfilePhoto(file) {
  if (!file) return "";

  const fileUri = getDataUri(file);
  const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
  return cloudResponse.secure_url;
}

export async function uploadResume(file) {
  if (!file) return null;

  if (!RESUME_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error("Unsupported resume file type.");
    err.status = 400;
    throw err;
  }

  if (file.size > MAX_RESUME_BYTES) {
    const err = new Error("Resume file too large (max 5MB).");
    err.status = 400;
    throw err;
  }

  const fileUri = getDataUri(file);
  const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
    folder: "resumes",
    resource_type: "auto",
  });

  return {
    url: cloudResponse.secure_url,
    originalName: file.originalname,
  };
}
```

**Principles:**

* **Encapsulate What Varies**: Cloudinary + validations are centralized.
* **SRP**: utilities have a single focused responsibility.

---

### 4.3 New Service Layer: `services/user.service.js`

#### Example: `updateUserProfile`

```js
// services/user.service.js
import { User } from "../models/user.model.js";
import { parseSkills } from "../utils/parseSkills.js";
import { uploadResume } from "../utils/fileUpload.js";

export async function updateUserProfile({ userId, data, file }) {
  const { fullname, email, phoneNumber, bio, skills } = data;

  if (email && typeof email !== "string") {
    const err = new Error("Invalid email.");
    err.status = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  if (email && email !== user.email) {
    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error("Email already in use by another account.");
      err.status = 409;
      throw err;
    }
    user.email = email;
  }

  if (!user.profile) user.profile = {};

  const skillsArray = parseSkills(skills);
  if (fullname) user.fullname = fullname;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (bio) user.profile.bio = bio;
  if (skillsArray.length) user.profile.skills = skillsArray;

  if (file) {
    const resumeInfo = await uploadResume(file);
    if (resumeInfo) {
      user.profile.resume = resumeInfo.url;
      user.profile.resumeOriginalName = resumeInfo.originalName;
    }
  }

  await user.save();

  return {
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
  };
}
```

---

### 4.4 Refactored Controller: `updateProfile` (After)

```js
// controllers/user.controller.js (auth controller)
import { updateUserProfile } from "../services/user.service.js";

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.id;

    const user = await updateUserProfile({
      userId,
      data: req.body,
      file: req.file,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
};
```

Now the controller is:

* Thin and readable.
* Free of Cloudinary, Mongoose, and parsing details.
* Easy to test (service can be unit-tested separately).

---

### 4.5 `register` Refactor (Before vs After)

#### Before (in controller, simplified)

```js
export const register = async (req, res) => {
  try {
    let { fullname, email, phoneNumber, password, role } = req.body;

    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({ message: "Something is missing", success: false });
    }

    email = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email.",
        success: false,
      });
    }

    let profilePhotoUrl = "";
    if (req.file) {
      const fileUri = getDataUri(req.file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
      profilePhotoUrl = cloudResponse.secure_url;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullname: String(fullname).trim(),
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      profile: { profilePhoto: profilePhotoUrl },
    });

    return res.status(201).json({ message: "Account created successfully.", user: newUser, success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};
```

#### After – Controller + Service

Controller:

```js
import { registerUser } from "../services/user.service.js";

export const register = async (req, res, next) => {
  try {
    const user = await registerUser({
      fullname: req.body.fullname,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      password: req.body.password,
      role: req.body.role,
      profileFile: req.file,
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
```

Service (`registerUser`), summarized:

```js
export async function registerUser({ fullname, email, phoneNumber, password, role, profileFile }) {
  // validate parameters
  // check existing user
  // handle profile photo via uploadProfilePhoto()
  // hash password
  // create user
  // return safe user object
}
```

**Principles:**

* **SRP**: controller focuses on HTTP, service on user-registration rules.
* **Program to Abstractions**: controller talks to service, not to Mongoose/Cloudinary directly.
* **Encapsulate What Varies**: upload logic in `fileUpload.js`.

---

## 5. Job Module Refactoring

Refactored: `job.controller.js` → `job.service.js` + `jobUtils.js`.

### 5.1 Original Design (Before)

Example: `postJob` before refactor:

```js
export const postJob = async (req, res, next) => {
  try {
    const { title, description, requirements, salary, location, jobType, experience, position, companyId } = req.body;
    const userId = req.id;

    if (!title || !description || !requirements || !salary || !location || !jobType || !experience || !position || !companyId) {
      return res.status(400).json({
        message: "Something is missing.",
        success: false
      });
    }

    const job = await Job.create({
      title,
      description,
      requirements: requirements.split(","),
      salary: Number(salary),
      location,
      jobType,
      experienceLevel: experience,
      position,
      company: companyId,
      created_by: userId
    });

    return res.status(201).json({
      message: "New job created successfully.",
      job,
      success: true
    });
  } catch (error) {
    next(error);
  }
};
```

Issues:

* Controller handles validation, parsing (`requirements.split(",")`), and DB creation.
* Hard to reuse logic for other job-related flows.

---

### 5.2 New Utility: `utils/jobUtils.js`

```js
// utils/jobUtils.js

export function parseRequirements(input) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.map(r => String(r).trim()).filter(Boolean);
  }

  return String(input)
    .split(",")
    .map(r => r.trim())
    .filter(Boolean);
}
```

---

### 5.3 New Service Layer: `services/job.service.js`

#### Example: `createJob` Service

```js
// services/job.service.js
import { Job } from "../models/job.model.js";
import { parseRequirements } from "../utils/jobUtils.js";

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
  if (!title || !description || !requirements || !salary || !location || !jobType || !experience || !position || !companyId) {
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
```

---

### 5.4 Refactored Controller: `postJob` (After)

```js
import { createJob, getAllJobsService, getJobByIdService, getAdminJobsService, deleteJobService } from "../services/job.service.js";

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
```

---

### 5.5 Query & List Refactor: `getAllJobs`

#### Before

```js
export const getAllJobs = async (req, res, next) => {
  try {
    const keyword = req.query.keyword || "";
    const query = {
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ]
    };
    const jobs = await Job.find(query).populate({ path: "company" }).sort({ createdAt: -1 });
    if (!jobs) { // ❌ find() returns [] not null
      return res.status(404).json({
        message: "Jobs not found.",
        success: false
      })
    };
    return res.status(200).json({
      jobs,
      success: true
    })
  } catch (error) {
    next(error);
  }
};
```

#### After – Service + Fixed Logic

Service:

```js
export async function getAllJobsService({ keyword }) {
  const normalized = String(keyword || "").trim();
  const query = normalized
    ? {
        $or: [
          { title: { $regex: normalized, $options: "i" } },
          { description: { $regex: normalized, $options: "i" } },
        ],
      }
    : {};

  const jobs = await Job.find(query)
    .populate({ path: "company" })
    .sort({ createdAt: -1 });

  if (!jobs || jobs.length === 0) {
    const err = new Error("No jobs found.");
    err.status = 404;
    throw err;
  }

  return jobs;
}
```

Controller:

```js
export const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await getAllJobsService({ keyword: req.query.keyword || "" });

    return res.status(200).json({
      jobs,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
```

**Fixes:**

* Correctly checks `jobs.length === 0` instead of `!jobs`.
* Moves query building into the service.
* Controller is pure HTTP orchestration.

---

### 5.6 Authorization Refactor: `deleteJob`

#### Before

```js
export const deleteJob = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const adminId = req.id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found.", success: false });
    }

    if (job.created_by.toString() !== adminId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to delete this job.",
        success: false,
      });
    }

    await Job.findByIdAndDelete(jobId);

    return res.status(200).json({
      message: "Job deleted successfully.",
      success: true,
    });

  } catch (error) {
    next(error);
  }
};
```

#### After – Controller + Service

Service:

```js
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
```

Controller:

```js
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
```

**Principles:**

* **SRP**: Controller only glues HTTP to service.
* **Encapsulate What Varies**: authorization rules live in service.

---

## 6. Shared Backend Utilities

### 6.1 `utils/cloudinary.js`

```js
import { v2 as cloudinary } from "cloudinary";

if (!process.env.API_KEY || !process.env.API_SECRET || !process.env.CLOUD_NAME) {
  throw new Error(
    "Missing Cloudinary env vars. Ensure .env contains CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and CLOUDINARY_CLOUD_NAME."
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

export default cloudinary;
```

**Design:**

* **Encapsulate What Varies**: All Cloudinary config in one place.
* **Fail Fast**: throws if env vars are missing at startup.

### 6.2 `utils/datauri.js`

```js
import DataUriParser from "datauri/parser.js";
import path from "path";

const getDataUri = (file) => {
  const parser = new DataUriParser();
  const extName = path.extname(file.originalname).toString();
  return parser.format(extName, file.buffer);
};

export default getDataUri;
```

Single responsibility: convert file → data URI.

### 6.3 `utils/db.js`

```js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongodb connected successfully");
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;
```

**Design:**

* All DB connection logic is centralized.
* App entry point calls `connectDB()` once.

---

## 7. Frontend Architecture

Frontend folder structure (high-level):

* `src/components/`

  * `admin/` – admin-specific views (job management, applicants, etc.).
  * `auth/` – login, register, profile screens.
  * `shared/` – shared layout / navigation components used across roles.
  * `ui/` – reusable UI primitives (buttons, inputs, cards, modals).
* `src/hooks/` – custom hooks (e.g. API hooks, auth hooks, pagination, etc.).
* `src/redux/` – slices, store configuration, actions/selectors.
* `src/utils/` – helper functions (formatters, constants, request helpers).
* `src/lib/` – integration helpers (API client abstractions, third-party wrappers).

### 7.1 Design Principles in Frontend

* **Component Composition over Inheritance**
  UI is built by composing small `ui/` components into larger `shared/`, `auth/`, `admin/` components, rather than reusing via inheritance.

* **Single Responsibility Principle**

  * `admin` components handle only admin views.
  * `auth` components handle login, signup, etc.
  * `ui` components are purely presentational.

* **Encapsulate What Varies**

  * API integration logic goes into hooks (`useSomething`) or `lib/`, so UI components stay focused on rendering and interaction.
  * Redux logic stays in `redux/`, so components use `useSelector` / `useDispatch` without knowing store internals.

* **DRY**

  * Shared UI (buttons, form fields, layout) lives in `components/ui` and `components/shared`.
  * Common hooks for data fetching or auth state avoid repeated `useEffect + fetch` code.

Even though the detailed refactoring examples are shown on the backend, the same mindset is applied on the frontend: **small, focused, composable units** instead of large, multi-responsibility components.

---

## 8. Design Principles Summary

Across the refactor, the following principles were actively applied:

* **Single Responsibility Principle (SRP)**

  * Controllers: HTTP-only.
  * Services: business logic.
  * Utils: infrastructure & small helpers.

* **Open/Closed Principle (OCP)**

  * New job or user features can be added by extending services without modifying controller signatures.

* **Liskov Substitution Principle (LSP)**

  * Service functions and utilities behave predictably and can be replaced with mocks in tests.

* **Interface Segregation Principle (ISP)**

  * Controllers depend only on functions they use (e.g. `registerUser`, `loginUser`), not on whole modules with unrelated concerns.

* **Dependency Inversion Principle (DIP)**

  * High-level controllers depend on service abstractions, not on low-level libraries like Mongoose, Cloudinary, or bcrypt.

* **Encapsulate What Varies**

  * File handling, Cloudinary integration, skill & requirement parsing, query building, etc. are extracted into utilities.

* **Composition Over Inheritance**

  * Models relate via composition (`Job` has-a `company`, `applications`) rather than inheritance.
  * UI components compose smaller ones instead of inheriting behavior.

* **Hollywood Principle**

  * Error handling is centralized; controllers call `next(error)` and let the framework call `errorHandler`.

* **DRY & Refactoring Patterns**

  * Extract Function (upload/parse logic into utils).
  * Move Function (logic from controllers → services).
  * Split Phase (validation vs persistence vs response).
  * Replace Temp with Query (simpler logic in services).

---