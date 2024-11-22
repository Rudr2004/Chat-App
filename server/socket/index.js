const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const mongoose = require("mongoose");
const getUserDetailsFromToken = require("../helper/getuserDetails.js");
const UserModel = require("../model/Usermodel.js");
const { ConversationModel, MessageModel } = require("../model/Conversation.js");
const getConversation = require("../helper/getconversation.js");

const app = express();

// Socket connection
const server = http.createServer(app);
const allowedOrigins = ["http://localhost:5173", "https://msg-app.netlify.app"];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Online users set
const onlineUser = new Set();

io.on("connection", async (socket) => {
  console.log("Connected User:", socket.id);

  const token = socket.handshake.auth.token;
  const user = await getUserDetailsFromToken(token);

  if (!user || !user._id || !mongoose.Types.ObjectId.isValid(user._id)) {
    console.error("Error: User or User ID is invalid", { user });
    socket.disconnect();
    return;
  }

  // Join user room
  socket.join(user._id.toString());
  onlineUser.add(user._id.toString());
  console.log("Online Users:", Array.from(onlineUser)); // Debugging log
  io.emit("onlineUser ", Array.from(onlineUser)); // Emit without extra space

  socket.on("message-page", async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid userId:", userId);
      return;
    }

    const userDetails = await UserModel.findById(userId).select("-password");
    if (!userDetails) {
      console.error("User  not found:", userId);
      return;
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

  socket.on("new message", async (data) => {
    if (
      !mongoose.Types.ObjectId.isValid(data.sender) ||
      !mongoose.Types.ObjectId.isValid(data.receiver)
    ) {
      console.error(
        "Invalid sender or receiver ID:",
        data.sender,
        data.receiver
      );
      return;
    }

    let conversation = await ConversationModel.findOne({
      $or: [
        { sender: data.sender, receiver: data.receiver },
        { sender: data.receiver, receiver: data.sender },
      ],
    });

    // Create conversation if not exists
    if (!conversation) {
      conversation = await new ConversationModel({
        sender: data.sender,
        receiver: data.receiver,
      }).save();
    }

    const message = new MessageModel({
      text: data.text,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      msgByUserId: data.msgByUserId,
    });
    const saveMessage = await message.save();

    await ConversationModel.updateOne(
      { _id: conversation._id },
      { $push: { messages: saveMessage._id } }
    );

    const getConversationMessage = await ConversationModel.findOne({
      $or: [
        { sender: data.sender, receiver: data.receiver },
        { sender: data.receiver, receiver: data.sender },
      ],
    })
      .populate("messages")
      .sort({ updatedAt: -1 });

    io.to(data.sender).emit("message", getConversationMessage?.messages || []);
    io.to(data.receiver).emit(
      "message",
      getConversationMessage?.messages || []
    );

    // Send updated conversations
    const conversationSender = await getConversation(data.sender);
    const conversationReceiver = await getConversation(data.receiver);
    io.to(data.sender).emit("conversation", conversationSender);
    io.to(data.receiver).emit("conversation", conversationReceiver);
  });

  socket.on("sidebar", async (currentUserId) => {
    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      console.error("Invalid currentUser  Id:", currentUserId);
      return;
    }

    const conversation = await getConversation(currentUserId);
    socket.emit("conversation", conversation);
  });

  socket.on("seen", async (msgByUserId) => {
    if (!mongoose.Types.ObjectId.isValid(msgByUserId)) {
      console.error("Invalid msgByUser  Id:", msgByUserId);
      return;
    }

    let conversation = await ConversationModel.findOne({
      $or: [
        { sender: user._id, receiver: msgByUserId },
        { sender: msgByUserId, receiver: user._id },
      ],
    });

    if (!conversation) {
      console.error("Conversation not found for user:", msgByUserId);
      return;
    }

    const conversationMessageId = conversation.messages || [];

    await MessageModel.updateMany(
      { _id: { $in: conversationMessageId }, msgByUserId: msgByUserId },
      { $set: { seen: true } }
    );

    // Send updated conversation
    const conversationSender = await getConversation(user._id.toString());
    const conversationReceiver = await getConversation(msgByUserId);

    io.to(user._id.toString()).emit("conversation", conversationSender);
    io.to(msgByUserId).emit("conversation", conversationReceiver);
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    onlineUser.delete(user._id.toString());
    console.log("Disconnected user:", socket.id);
    console.log("Updated Online Users:", Array.from(onlineUser)); // Debugging log
    io.emit("onlineUser ", Array.from(onlineUser)); // Update online users list without extra space
  });
});

// Export the app and server
module.exports = {
  app,
  server,
};
