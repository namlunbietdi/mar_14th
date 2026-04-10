const mongoose = require("mongoose");

const dispatchOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    conductorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null
    },
    plannedStartTime: {
      type: Date,
      required: true
    },
    plannedEndTime: {
      type: Date,
      required: true
    },
    actualStartTime: {
      type: Date,
      default: null
    },
    actualEndTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["planned", "running", "completed", "cancelled"],
      default: "planned",
      required: true
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

dispatchOrderSchema.index({ routeId: 1, plannedStartTime: 1 });
dispatchOrderSchema.index({ vehicleId: 1, plannedStartTime: 1 });
dispatchOrderSchema.index({ status: 1, plannedStartTime: 1 });

module.exports = mongoose.model("DispatchOrder", dispatchOrderSchema);
