## 1. Overview

This document summarizes the automated tests written for the backend of the ElevateU project.

- **Total test suites:** 14  
- **Total test cases:** 58  
- **Test runner:** Jest (ESM)  
- **Test types:**
  - Unit tests for **utilities**
  - Unit tests for **services**
  - Unit tests for **controllers**
  - Unit tests for **middleware**
  - Integration tests (HTTP) using **supertest**

External dependencies like MongoDB (Mongoose), Cloudinary, bcrypt, and JWT are mocked to keep tests deterministic, fast, and independent of external services.

---

## 2. Test Strategy

### 2.1 Unit Tests

Unit tests focus on a single function or module and mock all external dependencies.  
They are used to verify:

- Validation rules
- Business logic
- Interaction with models (via mocks)
- Controller behavior (status codes, JSON shape, `next(error)` calls)
- Middleware behavior (auth, error propagation)

### 2.2 Integration Tests

Integration tests verify the **request pipeline**:

`Express app → Router → Middleware → Controller → Service → ErrorHandler`

They use **supertest** to simulate HTTP requests to actual routes, while still mocking heavy dependencies (DB, Cloudinary, bcrypt, JWT).

---

## 3. Test Suite Summary

| #  | Suite Name                                      | File                                   | Type          | # Tests |
|----|-------------------------------------------------|----------------------------------------|---------------|--------:|
| 1  | `parseSkills` utility                           | `tests/parseSkills.test.js`           | Unit (util)   | 4 |
| 2  | `loginUser` service                             | `tests/loginUser.test.js`             | Unit (service)| 4 |
| 3  | `registerUser` service                          | `tests/registerUser.test.js`          | Unit (service)| 5 |
| 4  | `updateUserProfile` service                     | `tests/updateUserProfile.test.js`     | Unit (service)| 5 |
| 5  | `auth.controller - register`                    | `tests/authRegister.controller.test.js` | Unit (controller) | 2 |
| 6  | `auth.controller - login`                       | `tests/authLogin.controller.test.js`  | Unit (controller) | 2 |
| 7  | `auth.controller - updateProfile`              | `tests/authUpdateProfile.controller.test.js` | Unit (controller) | 4 |
| 8  | `middleware - isAuthenticated`                  | `tests/isAuthenticated.middleware.test.js` | Unit (middleware)| 4 |
| 9  | `job.service - createJob`                       | `tests/createJob.service.test.js`     | Unit (service)| 4 |
| 10 | `job.service - getAllJobsService`               | `tests/getAllJobsService.test.js`     | Unit (service)| 4 |
| 11 | `job.service - deleteJobService`                | `tests/deleteJobService.test.js`      | Unit (service)| 5 |
| 12 | `job.controller` (post/get/admin/delete flows)  | `tests/job.controller.test.js`        | Unit (controller) | 11 |
| 13 | `AUTH integration - POST /api/user/login`       | `tests/auth.integration.test.js`      | Integration   | 2 |
| 14 | `JOB integration - POST /api/job/post`          | `tests/job.integration.test.js`       | Integration   | 2 |

**Total:** 14 suites, 58 test cases ✅

---

## 4. Utility Tests

### 4.1 `parseSkills` – `tests/parseSkills.test.js`

**Function under test:** `parseSkills(skillsInput)` from `utils/parseSkills.js`

```js
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
````

**Test cases (4):**

1. **`skillsInput` is `null` / `undefined` / empty**

   * Expect returned array `[]`.
   * Rationale: Robustness when frontend sends nothing.

2. **String input `"React, Node ,  Docker "`**

   * Expect `["React", "Node", "Docker"]`.
   * Rationale: Trimming + splitting logic is correct.

3. **Array input `[" React ", "Node", "", "  "]`**

   * Expect `["React", "Node"]`.
   * Rationale: Handles arrays (e.g., multi-select UI) and discards empties.

4. **Handles extra spaces and different types**

   * Ensures internal normalization and `String(...)` casting work.

---

## 5. Auth Services Tests

### 5.1 `loginUser` – `tests/loginUser.test.js`

**Function under test:** `loginUser({ email, password, role })` in `services/user.service.js`.

Key behavior:

* Validates required fields.
* Normalizes email and role.
* Looks up user in DB.
* Verifies role and password using bcrypt.
* Signs JWT with `{ userId, role }`.
* Returns `{ token, user: safeUser }` (no password).

**Mocks used:**

* `User.findOne` (Mongoose model)
* `bcrypt.compare`
* `jwt.sign`

**Test cases (4):**

1. **Missing fields (email/password/role)**

   * Expect error with message `"Email, password and role are required."` & status `400`.

2. **User not found / mismatched role / missing password**

   * DB returns `null` or user has different `role` or `password` undefined.
   * Expect error `"Incorrect email, password or role."` & status `400`.

3. **Incorrect password**

   * `User.findOne` returns user, but `bcrypt.compare` → `false`.
   * Same error/message as above.

4. **Successful login**

   * `User.findOne` returns user, `bcrypt.compare` → `true`, `jwt.sign` returns `"fake-token"`.
   * Expect returned `{ token, user }` with correct fields and no password.
   * Confirms token payload contains `userId` and `role`.

---

### 5.2 `registerUser` – `tests/registerUser.test.js`

**Function under test:** `registerUser({ fullname, email, phoneNumber, password, role, profileFile })`.

Core behavior:

* Validates required fields.
* Normalizes email.
* Checks for existing user by email.
* Optional profile photo upload to Cloudinary.
* Hashes password with bcrypt.
* Creates user in DB.
* Handles duplicate key error from Mongo.
* Returns a **safe user object**.

**Mocks used:**

* `User.findOne`, `User.create`
* `bcrypt.hash`
* `uploadProfilePhoto` (so we avoid real Cloudinary)

**Test cases (5):**

1. **Missing required fields**

   * `fullname`, `email`, `phoneNumber`, `password`, `role`.
   * Each missing combination triggers error `"fullname, email, phoneNumber, password and role are required."` (400).

2. **User already exists (pre-check)**

   * `User.findOne` returns existing user.
   * Error `"User already exists with this email."` (400).

3. **Profile photo upload fails**

   * `User.findOne` → `null`, but `uploadProfilePhoto` rejects.
   * Error `"Failed to upload profile photo."` (502) and no user created.

4. **Mongo duplicate key error on create**

   * `User.findOne` → `null`, `uploadProfilePhoto` success, `bcrypt.hash` success.
   * `User.create` throws `{ code: 11000, keyPattern: { email: 1 } }`.
   * Error `"User already exists with this email."` (409).

5. **Successful registration**

   * All mocks successful.
   * Asserts:

     * `User.findOne` called with normalized email.
     * `uploadProfilePhoto` called when `profileFile` present.
     * `bcrypt.hash` used.
     * `User.create` payload has normalized `fullname` and numeric `phoneNumber`.
   * Returns safe user (no password).

---

### 5.3 `updateUserProfile` – `tests/updateUserProfile.test.js`

**Function under test:** `updateUserProfile({ userId, data, file })`.

Behavior:

* Validates `email` type.
* Checks if user exists.
* Checks for email uniqueness if changed.
* Uses `parseSkills` to normalize skills.
* Optionally uploads resume using `uploadResume`.
* Updates fields and saves user.
* Returns safe user.

**Mocks used:**

* `User.findById`, `User.findOne`
* `parseSkills`
* `uploadResume`

**Test cases (5):**

1. **Email is not a string**

   * `email` is e.g. a number.
   * Error `"Invalid email."` (400).

2. **User not found**

   * `User.findById` → `null`.
   * Error `"User not found."` (404).

3. **New email already in use**

   * `User.findById` returns user with `email = old@example.com`.
   * `data.email = "new@example.com"`, `User.findOne` finds another user.
   * Error `"Email already in use by another account."` (409).

4. **Successful update (including skills + resume)**

   * User found, no email conflict.
   * `parseSkills("React, Node")` → `["React","Node"]`.
   * `uploadResume` returns `{ url, originalName }`.
   * Asserts:

     * fields `fullname`, `email`, `phoneNumber`, `bio` updated,
     * `user.profile.skills`, `user.profile.resume`, `resumeOriginalName` set,
     * `user.save` called,
     * returned safe user matches updated doc.

5. **Error when resume upload fails**

   * `uploadResume` rejects.
   * Error is propagated; `user.save` not called.

---

## 6. Auth Controllers Tests

### 6.1 `register` controller – `tests/authRegister.controller.test.js`

**Function under test:** `register` in `auth.controller.js`.

Behavior:

* Calls `registerUser` service with props from `req.body` + `req.file`.
* Returns `201` + `{ message, user, success: true }`.
* Forwards any error to `next`.

**Mocks:** `registerUser`.

**Test cases (2):**

1. **Successful registration**

   * `registerUser` resolves to mock user.
   * Asserts correct arguments and response shape.

2. **Error is forwarded**

   * `registerUser` rejects with error.
   * Controller does not send response, calls `next(error)`.

---

### 6.2 `login` controller – `tests/authLogin.controller.test.js`

**Function under test:** `login` in `auth.controller.js`.

Behavior:

* Calls `loginUser`.
* Sets `token` cookie.
* Returns `200` + `{ message, user, success: true }`.
* Forwards errors to `next`.

**Mocks:** `loginUser`.

**Test cases (2):**

1. **Successful login**

   * Asserts `loginUser` args, `status(200)`, cookie set with token (checks `httpOnly` + `maxAge`), and JSON response.

2. **Error is forwarded**

   * `loginUser` rejects.
   * No response; `next(error)` called.

---

### 6.3 `updateProfile` controller – `tests/authUpdateProfile.controller.test.js`

**Function under test:** `updateProfile` in `auth.controller.js`.

Behavior:

* Uses `req.id` as `userId`.
* Passes `req.body` and `req.file` to service.
* Returns `200` + success message and updated user.
* Forwards errors to `next`.

**Mocks:** `updateUserProfile`.

**Test cases (4):**

1. **Success (no file)**

   * `updateUserProfile` resolves; checks arguments & response.

2. **Success with file**

   * `req.file` present; ensures file passed to service; response correct.

3. **Service error (e.g., user not found)**

   * `updateUserProfile` rejects; controller calls `next(error)`.

4. **`req.id` missing edge case**

   * `req.id = undefined`; service rejects.
   * Verifies controller still forwards error and doesn’t crash.

---

## 7. Middleware Tests

### 7.1 `isAuthenticated` – `tests/isAuthenticated.middleware.test.js`

**Function under test:** `isAuthenticated` middleware.

Behavior:

* Reads token from `req.cookies.token`.
* If absent → 401 `"User not authenticated"`.
* Verifies token via `jwt.verify`.
* If invalid/falsy → 401 `"Invalid token"`.
* If valid → `req.id = decode.userId` and calls `next()`.
* If `jwt.verify` throws → `next(error)`.

**Mocks:** `jsonwebtoken.verify`.

**Test cases (4):**

1. **No token in cookies**

   * Returns 401 with `{ message: "User not authenticated", success: false }`.

2. **`jwt.verify` returns falsy**

   * Token present, but decode null.
   * 401 `{ message: "Invalid token" }`.

3. **Valid token**

   * `jwt.verify` returns `{ userId: "user123" }`.
   * Sets `req.id` and calls `next()`; no response is sent.

4. **`jwt.verify` throws**

   * Error is passed to `next(error)`, no response.

---

## 8. Job Services Tests

### 8.1 `createJob` – `tests/createJob.service.test.js`

**Function under test:** `createJob({...})`.

Behavior:

* Validates required fields.
* Parses requirements via `parseRequirements`.
* Validates `salary` as positive number.
* Creates job document via `Job.create`.

**Mocks:** `Job.create`, `parseRequirements`.

**Test cases (4):**

1. **Missing required field (e.g., title, companyId, etc.)**

   * Error `"Required fields are missing."` (400).

2. **Salary is not a number (`"abc"`)**

   * Error `"Salary must be a valid positive number."` (400).

3. **Salary is zero or negative**

   * Same error as above; ensure `Job.create` never called.

4. **Success case**

   * `parseRequirements("React, JavaScript")` → `["React", "JavaScript"]`.
   * `Job.create` called with:

     * `salary` converted to number
     * `experienceLevel` derived from `experience`
     * `company` and `created_by` set correctly
   * Returns created job.

---

### 8.2 `getAllJobsService` – `tests/getAllJobsService.test.js`

**Function under test:** `getAllJobsService({ keyword })`.

Behavior:

* Builds a query based on `keyword`.
* Runs `Job.find(query).populate("company").sort({ createdAt: -1 })`.
* If no jobs → error `"No jobs found."` (404).

> Note: `buildQuery` is defined inside the same file and used implicitly.

**Mocks:**
`Job.find` is mocked to return a chainable object with `.populate().sort()`.

**Test cases (4):**

1. **Empty keyword**

   * Expects `Job.find({})`.
   * `populate` called with `{ path: "company" }`, `sort({ createdAt: -1 })`.
   * Returns jobs array.

2. **Keyword `"  dev  "`**

   * Trims keyword to `"dev"`.
   * Expects `$or` query with regex on `title` and `description`.
   * Chain returns jobs; result is passed through.

3. **Empty jobs array `[]`**

   * Should throw `"No jobs found."` (404).

4. **`jobs` is null/undefined**

   * Same 404 error; covers `!jobs` branch.

---

### 8.3 `deleteJobService` – `tests/deleteJobService.test.js`

**Function under test:** `deleteJobService({ jobId, adminId })`.

Behavior:

* Validates `jobId` and `adminId`.
* Finds job by ID.
* Ensures `created_by` matches `adminId`.
* Deletes job by ID.
* Returns `{ deleted: true }`.

**Mocks:** `Job.findById`, `Job.findByIdAndDelete`.

**Test cases (5):**

1. **Missing jobId**

   * Error `"Job ID is required."` (400).

2. **Missing adminId**

   * Error `"User ID is required."` (401).

3. **Job not found**

   * `Job.findById` → `null`.
   * Error `"Job not found."` (404).

4. **Admin is not job creator**

   * `job.created_by.toString() !== adminId.toString()`.
   * Error `"You are not authorized to delete this job."` (403).

5. **Success case**

   * Job found, creator matches.
   * `Job.findByIdAndDelete(jobId)` called.
   * Returns `{ deleted: true }`.

---

## 9. Job Controllers Tests

### 9.1 `job.controller` – `tests/job.controller.test.js`

**Controllers under test:**

* `postJob`
* `getAllJobs`
* `getJobById`
* `getAdminJobs`
* `deleteJob`

All use service functions from `job.service.js`.

**Mocks:**
`createJob`, `getAllJobsService`, `getJobByIdService`, `getAdminJobsService`, `deleteJobService`.

**Test cases (11 total):**

#### `postJob`

1. **Success**

   * Ensures `createJob` called with all required fields + `userId: req.id`.
   * Returns `201` + `{ message, job, success: true }`.

2. **Service error**

   * `createJob` rejects; `next(error)` called; no response.

#### `getAllJobs`

3. **No keyword provided**

   * `req.query = {}` → service called with `{ keyword: "" }`.
   * Response `200` with jobs.

4. **Keyword provided**

   * `req.query.keyword = "dev"` → service called with `{ keyword: "dev" }`.
   * Response `200` with jobs.

5. **Service error**

   * `getAllJobsService` rejects; controller forwards error with `next(error)`.

#### `getJobById`

6. **Success**

   * `req.params.id = "job123"`.
   * Calls `getJobByIdService("job123")` and returns `{ job, success: true }`.

7. **Service error**

   * Forwards error via `next(error)`.

#### `getAdminJobs`

8. **Success**

   * `req.id = "admin123"`.
   * Calls `getAdminJobsService("admin123")`.
   * Returns `{ jobs, success: true }`.

9. **Service error**

   * Forwards error via `next(error)`.

#### `deleteJob`

10. **Success**

    * Calls `deleteJobService({ jobId: req.params.id, adminId: req.id })`.
    * Returns `{ message: "Job deleted successfully.", success: true }`.

11. **Service error**

    * Forwards error via `next(error)`.

---

## 10. Integration Tests

### 10.1 AUTH – `POST /api/user/login` – `tests/auth.integration.test.js`

**App under test:** `testApp.js`

```js
// testApp.js (simplified)
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import userRoute from "./routes/user.route.js";
import jobRoute from "./routes/job.route.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use("/api/user", userRoute);
app.use("/api/job", jobRoute);

app.use(errorHandler);

export default app;
```

**Route tested:** `POST /api/user/login`

**Mocks used:**

* `User.findOne`
* `bcrypt.compare`
* `jwt.sign`
* Cloudinary/file upload utilities (mocked globally so they don’t throw env errors).

**Test cases (2):**

1. **Successful login**

   * `User.findOne` returns a fake user.
   * `bcrypt.compare` → `true`.
   * `jwt.sign` → `"mock-jwt-token"`.
   * Request:

     ```json
     { "email": "test@example.com", "password": "password123", "role": "student" }
     ```
   * Asserts:

     * `User.findOne` called with `{ email: "test@example.com" }`.
     * `bcrypt.compare("password123", "hashed-password")`.
     * `jwt.sign` payload includes `{ userId, role }`.
     * Response `200` with body:

       ```json
       {
         "message": "Welcome back Test User",
         "user": { "_id": "...", "fullname": "...", "email": "...," "phoneNumber": "...", "role": "student", "profile": {"..."} },
         "success": true
       }
       ```
     * `Set-Cookie` header contains `token=mock-jwt-token`.

2. **Invalid credentials**

   * `User.findOne` returns `null`.
   * `loginUser` throws error `"Incorrect email, password or role."` (400).
   * `errorHandler` returns:

     ```json
     {
       "success": false,
       "message": "Incorrect email, password or role."
     }
     ```

This integration test verifies the full pipeline:

> **Express routing → controller → service → error handler**, with external dependencies mocked.

---

### 10.2 JOB – `POST /api/job/post` – `tests/job.integration.test.js`

**Route tested:** `POST /api/job/post` (protected by `isAuthenticated`).

**Mocks used:**

* `jsonwebtoken.verify` (for auth)
* `Job.create`
* `parseRequirements`
* Cloudinary / fileUpload utilities

**Common setup:**

```js
jwt.verify.mockImplementation((token, secret) => {
  if (token === "valid.token") {
    return { userId: "admin123", role: "recruiter" };
  }
  throw new Error("Invalid token");
});
```

**Test cases (2):**

1. **Successful job creation**

   * Request includes valid cookie and body:

     ```http
     POST /api/job/post
     Cookie: token=valid.token

     {
       "title": "Frontend Dev",
       "description": "Build UI",
       "requirements": "React,JS",
       "salary": "800000",
       "location": "Remote",
       "jobType": "Full-time",
       "experience": 2,
       "position": 3,
       "companyId": "company123"
     }
     ```
   * `parseRequirements("React,JS")` → `["React", "JS"]`.
   * `Job.create` returns a fake job doc.
   * Asserts:

     * `isAuthenticated` sets `req.id = "admin123"`.
     * `Job.create` called with correct payload (salary: number, `experienceLevel`, `company`, `created_by`).
     * Response `201`:

       ```json
       {
         "message": "New job created successfully.",
         "job": { "..." },
         "success": true
       }
       ```

2. **Missing required field (e.g. `title`)**

   * `createJob` throws `"Required fields are missing."` (400).
   * Pipeline: controller → `next(error)` → `errorHandler`.
   * Response:

     ```json
     {
       "success": false,
       "message": "Required fields are missing."
     }
     ```
   * Ensures `Job.create` and `parseRequirements` are **not** called when validation fails.

---

## 11. Why These Tests?

1. **Coverage of critical paths**

   * Auth: registration, login, profile update, JWT auth middleware.
   * Job module: creation, listing, deletion, and controller flows.

2. **Validation & Error Handling**

   * Many tests explicitly verify error messages and HTTP status codes.
   * Good to demonstrate adherence to design principles + robust APIs.

3. **Refactoring-friendly**

   * Services are tested in isolation → easier to change controllers/routes later.
   * Controllers are thin and tested mainly for wiring and response/output.

4. **Realistic integration tests**

   * Show that the full Express pipeline works as expected (including cookies, auth, and error handling), while still using mocks to keep tests fast and deterministic.

---
