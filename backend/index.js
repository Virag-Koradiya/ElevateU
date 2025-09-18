import dotenv from "dotenv";
import express from "express";
import connectDB from "./utils/db.js";
import cors from "cors";
import userRoute from "./routes/user.route.js";

dotenv.config({});

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/api/user", userRoute);
// app.use("/", require("./routes"));

app.listen(process.env.PORT || 8000, (err) => {
    if(err){
        console.log("Error in connecting to server: ", err);
    }
    connectDB();
    console.log(`Server is running on port no: ${process.env.PORT}`);
});