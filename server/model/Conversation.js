const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Import the UUID function

const messageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4, // Set default value to a new UUID
    },
    text: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      default: "",
    },
    seen: {
      type: Boolean,
      default: false,
    },
    msgByUserId: {
      type: String, // Change this to String to accommodate UUIDs
      required: true,
      ref: "User ",
    },
  },
  {
    timestamps: true,
  }
);

const conversationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4, // Set default value to a new UUID
    },
    sender: {
      type: String, // Change this to String to accommodate UUIDs
      required: true,
      ref: "User ",
    },
    receiver: {
      type: String, // Change this to String to accommodate UUIDs
      required: true,
      ref: "User ",
    },
    messages: [
      {
        type: String, // Change this to String to accommodate UUIDs
        ref: "Message",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const MessageModel = mongoose.model("Message", messageSchema);
const ConversationModel = mongoose.model("Conversation", conversationSchema);

module.exports = {
  MessageModel,
  ConversationModel,
};
