const mongoose = require('mongoose');

const EmailCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

EmailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailCode', EmailCodeSchema);
