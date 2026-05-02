const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    operationStartDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["working", "issue", "removed"],
      required: true
    },
    configVersion: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Device", deviceSchema);
