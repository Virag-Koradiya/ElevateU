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
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
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
