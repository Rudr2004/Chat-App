const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helper/getuserDetails.js");
const UserModel = require("../model/Usermodel.js");
const { ConversationModel, MessageModel } = require("../model/Conversation.js");
const getConversation = require("../helper/getconversation.js");
const mongoose = require("mongoose"); // Import mongoose for ObjectId validation

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

//online user
const onlineUser = new Set();

// Function to validate ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

io.on("connection", async (socket) => {
  console.log("connect User ", socket.id);

  const token = socket.handshake.auth.token;

  //current user details
  const user = await getUserDetailsFromToken(token);

  //create a room
  if (user && user._id) {
    socket.join(user._id.toString());
    onlineUser.add(user._id.toString());
  } else {
    console.error("Error: User or User ID is undefined", { user });
  }

  io.emit("onlineUser ", Array.from(onlineUser));

  socket.on("message-page", async (userId) => {
    console.log("userId", userId);

    // Validate userId
    if (!isValidObjectId(userId)) {
      console.error("Invalid ObjectId:", userId);
      return; // Exit early or handle the error
    }

    try {
      const userDetails = await UserModel.findById(userId).select("-password");
      if (!userDetails) {
        console.error("User  not found for ID:", userId);
        return; // Handle user not found
      }

      const payload = {
        _id: userDetails?._id,
        name: userDetails?.name,
        email: userDetails?.email,
        profile_pic: userDetails?.profile_pic,
        online: onlineUser.has(userId),
      };
      socket.emit("message-user", payload);

      //get previous message
      const getConversationMessage = await ConversationModel.findOne({
        $or: [
          { sender: user?._id, receiver: userId },
          { sender: userId, receiver: user?._id },
        ],
      })
        .populate("messages")
        .sort({ updatedAt: -1 });

      socket.emit("message", getConversationMessage?.messages || []);
    } catch (error) {
      console.error("Error fetching user details or messages:", error);
    }
  });

  //new message
  socket.on("new message", async (data) => {
    // Validate sender and receiver IDs
    if (!isValidObjectId(data?.sender) || !isValidObjectId(data?.receiver)) {
      console.error("Invalid ObjectId for sender or receiver:", data);
      return; // Exit early or handle the error
    }

    try {
      //check conversation is available both user
      let conversation = await ConversationModel.findOne({
        $or: [
          { sender: data?.sender, receiver: data?.receiver },
          { sender: data?.receiver, receiver: data?.sender },
        ],
      });

      //if conversation is not available
      if (!conversation) {
        const createConversation = await ConversationModel({
          sender: data?.sender,
          receiver: data?.receiver,
        });
        conversation = await createConversation.save();
      }

      const message = new MessageModel({
        text: data.text,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        msgByUserId: data?.msgByUserId,
      });
      const saveMessage = await message.save();

      const updateConversation = await ConversationModel.updateOne(
        { _id: conversation?._id },
        {
          $push: { messages: saveMessage?._id },
        }
      );

      const getConversationMessage = await ConversationModel.findOne({
        $or: [
          { sender: data?.sender, receiver: data?.receiver },
          { sender: data?.receiver, receiver: data?.sender },
        ],
      })
        .populate("messages")
        .sort({ updatedAt: -1 });

      io.to(data?.sender).emit(
        "message",
        getConversationMessage?.messages || []
      );
      io.to(data?.receiver).emit(
        "message",
        getConversationMessage?.messages || []
      );

      //send conversation
      const conversationSender = await getConversation(data?.sender);
      const conversationReceiver = await getConversation(data?.receiver);

      io.to(data?.sender).emit("conversation", conversationSender);
      io.to(data?.receiver).emit("conversation", conversationReceiver);
    } catch (error) {
      console.error("Error sending new message:", error);
    }
  });

  //sidebar
  socket.on("sidebar", async (currentUserId) => {
    console.log("current user", currentUserId);

    // Validate currentUser Id
    if (!isValidObjectId(currentUserId)) {
      console.error("Invalid ObjectId for currentUser Id:", currentUserId);
      return; // Exit early or handle the error
    }

    try {
      const conversation = await getConversation(currentUserId);
      socket.emit("conversation", conversation);
    } catch (error) {
      console.error("Error fetching sidebar conversation:", error);
    }
  });

  socket.on("seen", async (msgByUserId) => {
    // Validate msgByUser Id
    if (!isValidObjectId(msgByUserId)) {
      console.error("Invalid ObjectId for msgByUser Id:", msgByUserId);
      return; // Exit early or handle the error
    }

    try {
      let conversation = await ConversationModel.findOne({
        $or: [
          { sender: user?._id, receiver: msgByUserId },
          { sender: msgByUserId, receiver: user?._id },
        ],
      });

      const conversationMessageId = conversation?.messages || [];

      const updateMessages = await MessageModel.updateMany(
        { _id: { $in: conversationMessageId }, msgByUserId: msgByUserId },
        { $set: { seen: true } }
      );

      //send conversation
      const conversationSender = await getConversation(user?._id?.toString());
      const conversationReceiver = await getConversation(msgByUserId);

      io.to(user?._id?.toString()).emit("conversation", conversationSender);
      io.to(msgByUserId).emit("conversation", conversationReceiver);
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

  //disconnect
  socket.on("disconnect", () => {
    onlineUser.delete(user?._id?.toString());
    console.log("disconnect user ", socket.id);
    io.emit("onlineUser ", Array.from(onlineUser));
  });
});

module.exports = {
  app,
  server,
};
