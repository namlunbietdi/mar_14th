const mongoose = require("mongoose");

const deviceLastStateSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      unique: true
    },
    deviceCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null
    },
    dispatchOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchOrder",
      default: null
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    speed: {
      type: Number,
      default: 0
    },
    heading: {
      type: Number,
      default: null
    },
    ignition: {
      type: Boolean,
      default: null
    },
    lastGpsTime: {
      type: Date,
      default: null
    },
    lastReceivedAt: {
      type: Date,
      default: null
    },
    connectionStatus: {
      type: String,
      enum: ["online", "offline", "unknown"],
      default: "unknown"
    }
  },
  {
    timestamps: true
  }
);

deviceLastStateSchema.index({ vehicleId: 1 });
deviceLastStateSchema.index({ connectionStatus: 1 });

module.exports = mongoose.model("DeviceLastState", deviceLastStateSchema);
