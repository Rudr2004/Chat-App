const express = require("express");
const cors = require("cors");
const connect = require("./config/db.js");
const router = require("./router/index.js");
const cookiesParser = require("cookie-parser");
const { app, server } = require("./socket/index.js");
require("dotenv").config();

//const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookiesParser());

const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.json({ message: "Server is running on " + PORT });
});

//Api End Points
app.use(router);

connect().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
  });
});
