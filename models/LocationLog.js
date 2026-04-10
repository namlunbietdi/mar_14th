const mongoose = require("mongoose");

const locationLogSchema = new mongoose.Schema(
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
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    speed: {
      type: Number,
      default: 0,
      min: 0
    },
    heading: {
      type: Number,
      default: null,
      min: 0,
      max: 360
    },
    altitude: {
      type: Number,
      default: null
    },
    ignition: {
      type: Boolean,
      default: null
    },
    gpsTime: {
      type: Date,
      required: true
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true
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

locationLogSchema.index({ deviceCode: 1, gpsTime: -1 });
locationLogSchema.index({ vehicleId: 1, gpsTime: -1 });
locationLogSchema.index({ dispatchOrderId: 1, gpsTime: -1 });
locationLogSchema.index({ receivedAt: -1 });

module.exports = mongoose.model("LocationLog", locationLogSchema);
