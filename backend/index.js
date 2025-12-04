import 'dotenv/config';
import express from "express";
import connectDB from "./utils/db.js";
import cors from "cors";
import userRoute from "./routes/user.route.js";
import applicationRoute from "./routes/application.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

app.use("/static", express.static(path.join(process.cwd(), "public")));

const corsOptions = {
    origin: [
        'https://elevate-u-jobs.vercel.app',
        'https://elevate-u-ashen.vercel.app',
        'http://localhost:5173', // vite dev server (default)
        'http://127.0.0.1:5173',
    ],
    credentials:true
}


app.use(cors(corsOptions));

app.use("/api/user", userRoute);
app.use("/api/application", applicationRoute);
app.use("/api/company", companyRoute);
app.use("/api/job", jobRoute);
// app.use("/", require("./routes"));

app.use(errorHandler);

app.listen(process.env.PORT || 8000, (err) => {
    if(err){
        console.log("Error in connecting to server: ", err);
    }
    connectDB();
    console.log(`Server is running on port no: ${process.env.PORT}`);
});