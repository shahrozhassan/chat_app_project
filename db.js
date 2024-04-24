const mongoose = require('mongoose');

// Define schemas
const messageSchema = new mongoose.Schema({
  message: String,
  nickname: String,
  roomNumber: String,
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: String,
  roomNumber: String,
  id: String 
});

// Define models
const Message = mongoose.model('Message', messageSchema);
const User = mongoose.model('User', userSchema);

module.exports = {
  Message,
  User
};
