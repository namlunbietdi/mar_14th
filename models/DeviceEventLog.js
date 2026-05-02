const mongoose = require("mongoose");

const deviceEventLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      default: null
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
    eventType: {
      type: String,
      required: true,
      trim: true
    },
    routeNumber: {
      type: String,
      trim: true,
      default: ""
    },
    direction: {
      type: String,
      enum: ["outbound", "inbound", ""],
      default: ""
    },
    stopCode: {
      type: String,
      trim: true,
      default: ""
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    eventTime: {
      type: Date,
      required: true
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    topic: {
      type: String,
      trim: true,
      default: ""
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

deviceEventLogSchema.index({ deviceCode: 1, eventTime: -1 });
deviceEventLogSchema.index({ eventType: 1, eventTime: -1 });
deviceEventLogSchema.index({ dispatchOrderId: 1, eventTime: -1 });

module.exports = mongoose.model("DeviceEventLog", deviceEventLogSchema);
