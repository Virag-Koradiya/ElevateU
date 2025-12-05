// testApp.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import userRoute from "./routes/user.route.js";
import jobRoute from "./routes/job.route.js";          // ⬅️ add this
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Routes used in integration tests
app.use("/api/user", userRoute);
app.use("/api/job", jobRoute);                         // ⬅️ add this

// Central error handler
app.use(errorHandler);

export default app;
