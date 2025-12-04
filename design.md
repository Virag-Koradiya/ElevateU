### Centralized Error Handling with Middleware

#### Problem in Initial Design

Initially, each controller handled errors in its own way:

- Repeated `try/catch` blocks with `console.log(error)` or `console.error(error)`.
- Manual `res.status(500).json({ ... })` in multiple places.
- Some branches returned responses, others just logged and did nothing.
- Inconsistent error messages and structures (`{ message, success }` vs plain text).

This led to:

- **Duplicate code** (same error-handling logic scattered everywhere).
- **Inconsistent API responses**.
- Controllers mixing **business logic + HTTP concerns + error handling**, violating the **Single Responsibility Principle (SRP)**.

---

#### Refactored Design: Global `errorHandler` Middleware

We introduced a centralized error-handling middleware:

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
````

This middleware is registered **after all routes** in `app.js`:

```js
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/company", companyRoutes);

// Must be last
app.use(errorHandler);
```

Now, any controller can forward unexpected errors using `next(error)`, and the middleware is responsible for logging and sending a consistent response.

---

#### Controller Changes

Controllers were updated from:

```js
export const login = async (req, res) => {
  try {
    // ...logic
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};
```

to:

```js
export const login = async (req, res, next) => {
  try {
    // ...same core logic
  } catch (error) {
    next(error); // delegate to global error handler
  }
};
```

We still handle **expected business errors** (e.g., validation, not found, unauthorized) close to the controller:

```js
if (!email || !password || !role) {
  return res.status(400).json({
    message: "Email, password and role are required.",
    success: false,
  });
}
```

But **unexpected errors** (DB issues, unhandled exceptions, etc.) are passed to `next(error)`.

---

#### Design Principles Applied

* **Single Responsibility Principle (SRP)**
  Controllers now focus on:

  * Parsing `req`
  * Calling services / models
  * Returning successful responses
    Error formatting and logging are handled by a dedicated `errorHandler` middleware.

* **Hollywood Principle – “Don’t call us, we’ll call you”**
  Instead of every controller deciding how to handle errors, we let **Express** (the framework) call our `errorHandler` whenever something goes wrong:

  ```js
  // In controllers
  catch (error) {
    next(error);
  }
  ```

  Express manages the control flow and invokes the error middleware, not the other way around.

* **DRY (Don’t Repeat Yourself)**
  We removed repeated `console.log(error)` + `res.status(500).json(...)` from multiple controllers.
  All generic error responses now come from a **single place**.

* **Encapsulate What Varies**
  Error formatting and logging strategy are likely to change (e.g., log to a file, send to a monitoring service).
  By encapsulating this in `errorHandler`, we can change error behavior without touching every controller.

---

#### Result

* Consistent JSON error format:

  ```json
  { "success": false, "message": "..." }
  ```
* Cleaner, shorter controllers.
* Easier to maintain and extend (e.g., adding logging, metrics, or error codes in one place).
* Design is now more aligned with **modern Express best practices** and the **design principles taught in class**.

--- 

### Architectural Style: MVC + Utility Layer

Our backend follows a **Model–View–Controller (MVC)** style with a clear separation of concerns:

- **Models (`models/`)** define the data structure and persistence logic (Mongoose schemas and models).
- **Controllers (`controllers/`)** handle HTTP requests, orchestrate business logic, and return responses.
- **Routes (`routes/`)** map HTTP endpoints to controller actions.
- **Utils (`utils/`)** encapsulate cross-cutting infrastructure concerns such as database connection, file conversion, and third-party service configuration.

This structure improves modularity and makes the codebase easier to maintain and reason about.

---

### Encapsulating Infrastructure & External Dependencies (Encapsulate What Varies)

We identified external integrations and low-level details as parts of the system that are likely to change (e.g., switching cloud provider, changing DB URI, or altering file upload strategy). To avoid scattering this logic across controllers, we extracted them into dedicated utility modules:

#### `utils/cloudinary.js`

```js
import { v2 as cloudinary } from "cloudinary";

if (!process.env.API_KEY || !process.env.API_SECRET || !process.env.CLOUD_NAME) {
  throw new Error("Missing Cloudinary env vars...");
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.API_KEY,
    api_secret: process.env.API_SECRET,
  secure: true,
});

export default cloudinary;
````

* **Encapsulate What Varies:** All Cloudinary configuration and credentials are centralized in one place.
  Controllers and services simply import `cloudinary` and do not need to know about API keys or config details.
* **Fail Fast Principle:** We validate required environment variables at startup and throw an error early if they are missing.
  This prevents the app from running in a partially broken state and surfaces configuration issues immediately.

#### `utils/datauri.js`

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

* **Single Responsibility Principle:** This utility does exactly one job — converting an uploaded file into a Data URI format.
* **Encapsulate What Varies:** If we change how we process or encode files (e.g., different parser or format), only this utility needs to change. Controllers remain untouched.

#### `utils/db.js`

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

* **Separation of Concerns:** Database connection logic is isolated from the rest of the codebase.
  The application entry point just calls `connectDB()` once during startup.
* **Encapsulate What Varies:** Any future changes to database configuration (URI, options, retries, connection pool settings) are localized to this file.

---

### Programming to Abstractions (Lightweight DIP)

Rather than configuring third-party libraries (Mongoose, Cloudinary, DataUriParser) directly inside controllers, we access them through our own small abstraction modules (`connectDB`, `cloudinary`, `getDataUri`). This is a lightweight application of the **Dependency Inversion Principle**:

* High-level modules (controllers/services) depend on our abstractions (`connectDB`, `cloudinary`, `getDataUri`) instead of directly on low-level library details.
* This makes it easier to replace or modify the underlying implementation (e.g., switching from Cloudinary to another storage provider) with minimal impact on the rest of the system.

---

### Benefits

By combining MVC with a dedicated utility/infrastructure layer:

* We **reduced coupling** between business logic and external libraries.
* We **centralized configuration and integration code**, making it easier to debug and modify.
* We kept modules **small, focused, and reusable**, which aligns with SRP and improves maintainability.

---

# 🧩 User Controller Refactoring (Before → After)

## 1. Reason for Refactoring

Originally, the **User Controller** contained too much logic:

* Validation
* Password hashing
* Database operations
* File upload + Cloudinary logic
* Data URI conversion
* Skill parsing
* Error handling
* JWT creation

This violated several design principles:

* Single Responsibility Principle
* DRY (duplicate logic)
* Tight coupling with external services
* No clear separation between business logic and HTTP logic
* No centralized error handling

To fix this, I applied **layered architecture**, extracted utilities, created a **service layer**, and integrated the **global error handler**.

---

# 2. Before Refactoring (Controller was doing everything)

Below is a shortened but representative version of the **old controller**:

```js
export const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, bio, skills } = req.body;
    const file = req.file;
    const userId = req.id;

    const user = await User.findById(userId);

    if (skills) {
      let skillsArray;
      if (Array.isArray(skills)) {
        skillsArray = skills.map(s => String(s).trim());
      } else {
        skillsArray = String(skills).split(',').map(s => s.trim());
      }
      user.profile.skills = skillsArray;
    }

    if (file) {
      const allowedMimes = ['application/pdf','application/msword'];
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Unsupported file" });
      }

      const fileUri = getDataUri(file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
      user.profile.resume = cloudResponse.secure_url;
    }

    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (bio) user.profile.bio = bio;

    await user.save();
    return res.status(200).json({ message: "Updated", user });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
```

### Problems in the Old Code

* Controller handled **skill parsing**
* Controller handled **resume validation**
* Controller handled **Cloudinary upload**
* Controller handled **file → Data URI conversion**
* Controller directly used **User model**, **Cloudinary SDK**
* Controller manually handled **errors**

This violated SRP, DIP, and was not maintainable.

---

# 3. After Refactoring (Controller → Service → Utils)

### Controller now only handles:

* receiving request
* calling the service
* sending standardized response
* passing errors to global error handler

### Business logic moved into:

* `services/user.service.js`

### Upload logic moved into:

* `utils/fileUpload.js`

### Skill parsing moved into:

* `utils/parseSkills.js`

### Cloudinary config isolated in:

* `utils/cloudinary.js`

### Global error handling using:

* `next(error)`

---

# 4. After Refactoring – New Controller Code

```js
import { registerUser, loginUser, updateUserProfile, getUserById } from "../services/user.service.js";

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

### What Changed?

| Before (Old)                               | After (New)                            |
| ------------------------------------------ | -------------------------------------- |
| Controller handled everything              | Controller only forwards data          |
| No service layer                           | Added service layer for business logic |
| No global error handling                   | Uses `next(error)`                     |
| File upload & validation inside controller | Extracted into `utils/fileUpload.js`   |
| Skill parsing inside controller            | Extracted into `utils/parseSkills.js`  |
| Cloudinary logic scattered                 | Now isolated in a single utility       |
| Hard to test                               | Easy to test (service functions)       |
| Violated SRP                               | Fully follows SRP, DIP                 |

---

# 5. Created Service Layer (Example)

```js
export async function updateUserProfile({ userId, data, file }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  const skillsArray = parseSkills(data.skills);
  if (skillsArray.length) {
    user.profile.skills = skillsArray;
  }

  if (file) {
    const resumeInfo = await uploadResume(file);
    user.profile.resume = resumeInfo.url;
    user.profile.resumeOriginalName = resumeInfo.originalName;
  }

  await user.save();
  return user;
}
```

---

# 6. Refactoring Techniques Used

### **Extract Function**

* Skill parsing → `parseSkills()`
* Resume upload → `uploadResume()`

### **Move Function**

* Profile update logic moved from controller → service

### **Split Phase**

Profile update now has phases:

1. Validate input
2. Upload resume
3. Update user
4. Save user

### **Replace Temp with Query**

Simplified logic inside services instead of storing temp values everywhere.

---

# 7. Principles Applied

### **Single Responsibility Principle**

Controller, service, and utils all have ONE job.

### **Encapsulate What Varies**

File uploads, parsing logic, Cloudinary config moved into utils.

### **Dependency Inversion Principle**

Controller depends on service abstraction, not Mongoose or Cloudinary.

### **Separation of Concerns**

Business logic (service) ≠ HTTP layer (controller).

### **DRY**

Duplicate logic removed.

### **Hollywood Principle**

ErrorHandler calls controller back, not the other way.

---

# 8. Final Result

After refactoring, the **user controller**:

* became clean, short, and readable
* delegates business logic to a service
* delegates variable logic (uploads, parsing) to utils
* handles errors via centralized errorHandler
* follows SOLID and clean code guidelines

This greatly improves maintainability and scalability of the authentication/user module.

---
