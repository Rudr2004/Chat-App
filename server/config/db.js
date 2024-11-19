const mongoose = require("mongoose");
require("dotenv").config();
async function connect() {
  try {
    const URL =
      "mongodb+srv://rudrajan24:rudrajan24@chat-app.7sm6c.mongodb.net/?retryWrites=true";
    await mongoose.connect(URL);
    const connection = mongoose.connection;
    connection.on("connected", () => {
      console.log("Connected");
    });
    connection.on("error", (error) => {
      console.log("Error to connect", error);
    });
  } catch (error) {
    console.log("Not Connected", error);
  }
}

module.exports = connect;
