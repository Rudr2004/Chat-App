const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helper/getuserDetails.js");
const UserModel = require("../model/Usermodel.js");
const { ConversationModel, MessageModel } = require("../model/Conversation.js");
const getConversation = require("../helper/getconversation.js");

const app = express();

// Create HTTP server and Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Online user set
const onlineUsers = new Set();

// Socket connection handling
io.on("connection", async (socket) => {
  console.log("Connected user:", socket.id);
  const token = socket.handshake.auth.token;

  // Validate the token and get user details
  const user = await getUserDetailsFromToken(token);
  if (!user) {
    console.log("Invalid token, disconnecting...");
    socket.disconnect();
    return;
  }

  // Join the user to their room and mark them as online
  socket.join(user._id);
  onlineUsers.add(user._id);

  console.log("Online users:", Array.from(onlineUsers));
  io.emit("onlineUser ", Array.from(onlineUsers)); // Emit updated online users

  // Handle user disconnection
  socket.on("disconnect", () => {
    onlineUsers.delete(user._id);
    console.log("Disconnected user:", user._id);
    console.log("Updated online users:", Array.from(onlineUsers));
    io.emit("onlineUser ", Array.from(onlineUsers)); // Emit updated online users
  });

  // Handle message page request
  socket.on("message-page", async (userId) => {
    console.log("userId", userId);
    const userDetails = await UserModel.findById(userId).select("-password");

    const payload = {
      _id: userDetails?._id,
      name: userDetails?.name,
      email: userDetails?.email,
      profile_pic: userDetails?.profile_pic,
      online: onlineUsers.has(userId),
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

  // Handle new messages
  socket.on("new message", async (data) => {
    // Check if a conversation exists
    let conversation = await ConversationModel.findOne({
      $or: [
        { sender: data?.sender, receiver: data?.receiver },
        { sender: data?.receiver, receiver: data?.sender },
      ],
    });

    // If no conversation exists, create a new one
    if (!conversation) {
      const createConversation = new ConversationModel({
        sender: data?.sender,
        receiver: data?.receiver,
      });
      conversation = await createConversation.save();
    }

    // Create and save the new message
    const message = new MessageModel({
      text: data.text,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      msgByUserId: data?.msgByUserId, // Ensure this is a UUID string
    });
    const savedMessage = await message.save();

    // Update the conversation with the new message
    await ConversationModel.updateOne(
      { _id: conversation?._id },
      {
        $push: { messages: savedMessage?._id },
      }
    );

    // Emit the updated messages to both sender and receiver
    const updatedConversationMessage = await ConversationModel.findOne({
      $or: [
        { sender: data?.sender, receiver: data?.receiver },
        { sender: data?.receiver, receiver: data?.sender },
      ],
    })
      .populate("messages")
      .sort({ updatedAt: -1 });

    io.to(data?.sender).emit(
      "message",
      updatedConversationMessage?.messages || []
    );
    io.to(data?.receiver).emit(
      "message",
      updatedConversationMessage?.messages || []
    );

    // Send updated conversations to both users
    const conversationSender = await getConversation(data?.sender);
    const conversationReceiver = await getConversation(data?.receiver);

    io.to(data?.sender).emit("conversation", conversationSender);
    io.to(data?.receiver).emit("conversation", conversationReceiver);
  });

  // Handle sidebar request
  socket.on("sidebar", async (currentUserId) => {
    console.log("current user", currentUserId);
    const conversation = await getConversation(currentUserId);
    socket.emit("conversation", conversation);
  });

  // Handle message seen status
  socket.on("seen", async (msgByUserId) => {
    let conversation = await ConversationModel.findOne({
      $or: [
        { sender: user._id, receiver: msgByUserId },
        { sender: msgByUserId, receiver: user._id },
      ],
    });

    const conversationMessageId = conversation?.messages || [];

    await MessageModel.updateMany(
      { _id: { $in: conversationMessageId }, msgByUserId: msgByUserId },
      { $set: { seen: true } }
    );

    // Send updated conversations to both users
    const conversationSender = await getConversation(user._id);
    const conversationReceiver = await getConversation(msgByUserId);

    io.to(user._id).emit("conversation", conversationSender);
    io.to(msgByUserId).emit("conversation", conversationReceiver);
  });
});

// Export the app and server
module.exports = {
  app,
  server,
};
