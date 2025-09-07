require("dotenv").config();
const express = require("express");
const connectDB = require("./utils/db");
const cors = require("cors");

connectDB();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// app.use("/", require("./routes"));

app.listen(process.env.PORT || 8000, (err) => {
    if(err){
        console.log("Error in connecting to server: ", err);
    }
    console.log(`Server is running on port no: ${process.env.PORT}`);
});

module.exports = app;