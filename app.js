const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const { Message, User } = require('./db'); // Import models from db.js

// Static Folder
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true })); // Middleware to parse form data

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});

// MongoDB Setup
app.get('/chat.html', (req, res) => {
  res.sendFile(__dirname + '/chat.html');
});
app.get('/index.html', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Use correct MongoDB connection string
mongoose.connect('mongodb://localhost:27017/chatApp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));


// Registration Endpoint
app.post('/register', async (req, res) => {
  const { nickname } = req.body;
  if (!nickname) {
    return res.status(400).send('Nickname is required');
  }

  try {
    // Insert user into MongoDB
    const newUser = new User({ name: nickname });
    await newUser.save();
    console.log('User registered:', newUser);
    res.redirect('/chat.html'); // Redirect to chat.html after registration
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user');
  }
});

// Setup Websocket
let users = [];

const chatNamespace = io.of("/chat");

chatNamespace.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Listening
  socket.on("disconnect", () => {
    const index = users.findIndex((s) => s.id == socket.id);
    if (index !== -1) users.splice(index, 1);
    chatNamespace.emit("online", users);
    console.log("User Disconnected");
  });

  socket.on("chat message", async (data) => {
    const date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    if (hours <= 9) {
      hours = `0${hours}`;
    }
    if (minutes <= 9) {
      minutes = `0${minutes}`;
    }
    data.date = `${hours}:${minutes}`;

    // Save the message to the database
    const newMessage = new Message({
      message: data.message,
      nickname: data.nickname,
      roomNumber: data.roomNumber
    });
    await newMessage.save();

    chatNamespace.to(data.roomNumber).emit("chat message", data);
  });

  socket.on("typing", (data) => {
    socket.broadcast.in(data.roomNumber).emit("typing", `${data.name} is typing...`);
  });

  socket.on("login", (data) => {
    users.push({
      id: socket.id,
      name: data.nickname,
      roomNumber: data.roomNumber,
    });
    socket.join(data.roomNumber);

    chatNamespace.emit("online", users);
    console.log(`${data.nickname} connected`);
  });

  socket.on("pvChat", (data) => {
    chatNamespace.to(data.to).emit("pvChat", data);
  });
});
