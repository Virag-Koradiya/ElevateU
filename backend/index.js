import dotenv from "dotenv";
import express from "express";
import connectDB from "./utils/db.js";
import cors from "cors";
import userRoute from "./routes/user.route.js";
import applicationRoute from "./routes/application.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import cookieParser from "cookie-parser";
dotenv.config({});

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

const corsOptions = {
    origin: [
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

app.listen(process.env.PORT || 8000, (err) => {
    if(err){
        console.log("Error in connecting to server: ", err);
    }
    connectDB();
    console.log(`Server is running on port no: ${process.env.PORT}`);
});