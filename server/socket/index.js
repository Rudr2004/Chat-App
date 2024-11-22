const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helper/getuserDetails.js");
const UserModel = require("../model/Usermodel.js");
const { ConversationModel, MessageModel } = require("../model/Conversation.js");
const getConversation = require("../helper/getconversation.js");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

const app = express();

/***socket connection */
const server = http.createServer(app);
const allowedOrigins = ["http://localhost:5173", "https://msg-app.netlify.app"];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Online user set
const onlineUser = new Set();

io.on("connection", async (socket) => {
  console.log("Connected User", socket.id);

  const token = socket.handshake.auth.token;

  // Current user details
  const user = await getUserDetailsFromToken(token);
  if (!user) {
    console.error("Invalid token");
    return; // Exit if user is not found
  }

  // Create a room
  socket.join(user._id);
  onlineUser.add(user._id.toString());

  io.emit("onlineUser ", Array.from(onlineUser));

  socket.on("message-page", async (userId) => {
    console.log("userId", userId);
    // Validate userId
    if (!ObjectId.isValid(userId)) {
      console.error("Invalid userId format:", userId);
      return; // Exit if invalid
    }

    const userDetails = await UserModel.findById(userId).select("-password");
    if (!userDetails) {
      console.error("User  not found:", userId);
      return; // Exit if user not found
    }

    const payload = {
      _id: userDetails._id,
      name: userDetails.name,
      email: userDetails.email,
      profile_pic: userDetails.profile_pic,
      online: onlineUser.has(userId),
    };
    socket.emit("message-user", payload);

    // Get previous messages
    const getConversationMessage = await ConversationModel.findOne({
      $or: [
        { sender: user._id, receiver: userId },
        { sender: userId, receiver: user._id },
      ],
    })
      .populate("messages")
      .sort({ updatedAt: -1 });

    socket.emit("message", getConversationMessage?.messages || []);
  });

  // New message
  socket.on("new message", async (data) => {
    // Validate sender and receiver IDs
    if (!ObjectId.isValid(data.sender) || !ObjectId.isValid(data.receiver)) {
      console.error(
        "Invalid sender or receiver ID format:",
        data.sender,
        data.receiver
      );
      return; // Exit if invalid
    }

    // Check if a conversation already exists between the sender and receiver
    let conversation = await ConversationModel.findOne({
      $or: [
        { sender: ObjectId(data.sender), receiver: ObjectId(data.receiver) },
        { sender: ObjectId(data.receiver), receiver: ObjectId(data.sender) },
      ],
    });

    // If conversation is not available, create a new one
    if (!conversation) {
      const createConversation = new ConversationModel({
        sender: data.sender,
        receiver: data.receiver,
      });
      conversation = await createConversation.save();
    }

    // Create a new message instance
    const message = new MessageModel({
      text: data.text,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      msgByUserId: data.msgByUserId,
    });

    // Save the message to the database
    const saveMessage = await message.save();

    // Update the conversation to include the new message
    await ConversationModel.updateOne(
      { _id: conversation._id },
      {
        $push: { messages: saveMessage._id },
      }
    );

    // Retrieve the updated conversation messages
    const getConversationMessage = await ConversationModel.findOne({
      $or: [
        { sender: data.sender, receiver: data.receiver },
        { sender: data.receiver, receiver: data.sender },
      ],
    })
      .populate("messages")
      .sort({ updatedAt: -1 });

    // Emit the updated messages to both the sender and receiver
    io.to(data.sender).emit("message", getConversationMessage?.messages || []);
    io.to(data.receiver).emit(
      "message",
      getConversationMessage?.messages || []
    );

    // Send updated conversation to both users
    const conversationSender = await getConversation(data.sender);
    const conversationReceiver = await getConversation(data.receiver);

    io.to(data.sender).emit("conversation", conversationSender);
    io.to(data.receiver).emit("conversation", conversationReceiver);
  });

  // Sidebar
  socket.on("sidebar", async (currentUserId) => {
    console.log("current user", currentUserId);

    const conversation = await getConversation(currentUserId);
    socket.emit("conversation", conversation);
  });

  // Seen message
  socket.on("seen", async (msgByUserId) => {
    // Validate msgByUser Id
    if (!ObjectId.isValid(msgByUserId)) {
      console.error("Invalid msgByUser Id format:", msgByUserId);
      return; // Exit if invalid
    }

    let conversation = await ConversationModel.findOne({
      $or: [
        { sender: ObjectId(user._id), receiver: ObjectId(msgByUserId) },
        { sender: ObjectId(msgByUserId), receiver: ObjectId(user._id) },
      ],
    });

    if (!conversation) {
      console.error(
        "Conversation not found for user:",
        user._id,
        "and msgByUser Id:",
        msgByUserId
      );
      return; // Exit if conversation not found
    }

    const conversationMessageId = conversation.messages || [];

    // Update messages to mark them as seen
    await MessageModel.updateMany(
      { _id: { $in: conversationMessageId }, msgByUserId: msgByUserId },
      { $set: { seen: true } }
    );

    // Send updated conversation to both users
    const conversationSender = await getConversation(user._id.toString());
    const conversationReceiver = await getConversation(msgByUserId);

    io.to(user._id.toString()).emit("conversation", conversationSender);
    io.to(msgByUserId).emit("conversation", conversationReceiver);
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    onlineUser.delete(user._id.toString());
    console.log("Disconnected user", socket.id);
    io.emit("onlineUser ", Array.from(onlineUser));
  });
});

module.exports = {
  app,
  server,
};
