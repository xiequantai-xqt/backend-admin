const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // 其他字段如 email, role 等
});

module.exports = mongoose.model('User', UserSchema);