const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  roles: { type: [String], default: ['user'] },
  realName: { type: String },
});

module.exports = mongoose.model('User', UserSchema);
