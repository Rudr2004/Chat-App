const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db.js");
const router = require("./router/index.js");
const cookiesParser = require("cookie-parser");
const { app, server } = require("./socket/index.js");

// const app = express()
app.use(
  cors({
    origin: ["http://localhost:5173", "https://msg-app.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookiesParser());

const PORT = process.env.PORT || 3000;

app.get("/", (request, response) => {
  response.json({
    message: "Server running at " + PORT,
  });
});

//api endpoints
app.use("/api", router);

connectDB().then(() => {
  server.listen(PORT, () => {
    //  console.log("server running at " + PORT);
  });
});
