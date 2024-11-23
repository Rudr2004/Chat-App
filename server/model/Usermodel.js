const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Import the UUID function

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4, // Set default value to a new UUID
    },
    name: {
      type: String,
      required: [true, "provide name"],
    },
    email: {
      type: String,
      required: [true, "provide email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "provide password"],
    },
    profile_pic: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.model("User ", userSchema);

module.exports = UserModel;
