const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
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
      // Corrected field name to match the schema definition
      type: mongoose.Schema.Types.ObjectId, // Corrected ObjectId definition
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
    sender: {
      type: mongoose.Schema.Types.ObjectId, // Corrected ObjectId definition
      required: true,
      ref: "User ",
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId, // Corrected ObjectId definition
      required: true,
      ref: "User ",
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId, // Corrected ObjectId definition
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

// Function to create a message and a conversation
async function createMessageAndConversation(senderId, receiverId, messageText) {
  // Validate ObjectId
  if (
    !mongoose.Types.ObjectId.isValid(senderId) ||
    !mongoose.Types.ObjectId.isValid(receiverId)
  ) {
    throw new Error("Invalid User ID");
  }

  // Create a new message
  const message = new MessageModel({
    text: messageText,
    msgByUserId: senderId, // This should be a valid ObjectId
  });

  // Save the message to the database
  const savedMessage = await message.save();

  // Create a new conversation
  const conversation = new ConversationModel({
    sender: senderId, // This should be a valid ObjectId
    receiver: receiverId, // This should be a valid ObjectId
    messages: [savedMessage._id], // Store the ID of the saved message
  });

  // Save the conversation to the database
  const savedConversation = await conversation.save();

  return { message: savedMessage, conversation: savedConversation };
}

// Exporting models and the function
module.exports = {
  MessageModel,
  ConversationModel,
  createMessageAndConversation,
};
