const mongoose = require("mongoose");

const deviceAssignmentSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true
    },
    dispatchOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchOrder",
      default: null
    },
    assignedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    unassignedAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

deviceAssignmentSchema.index({ deviceId: 1, isActive: 1 });
deviceAssignmentSchema.index({ vehicleId: 1, isActive: 1 });
deviceAssignmentSchema.index({ dispatchOrderId: 1 });
deviceAssignmentSchema.index({ assignedAt: -1 });

module.exports = mongoose.model("DeviceAssignment", deviceAssignmentSchema);
