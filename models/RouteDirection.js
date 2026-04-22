const mongoose = require("mongoose");

const routeDirectionStopSchema = new mongoose.Schema(
  {
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
      required: true
    },
    order: {
      type: Number,
      required: true,
      min: 1
    },
    isTerminal: {
      type: Boolean,
      default: false
    },
    audioId: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const routeDirectionSchema = new mongoose.Schema(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true
    },
    direction: {
      type: String,
      enum: ["outbound", "inbound"],
      required: true
    },
    stops: {
      type: [routeDirectionStopSchema],
      default: []
    },
    version: {
      type: Number,
      min: 1,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

routeDirectionSchema.index({ routeId: 1, direction: 1 }, { unique: true });

module.exports = mongoose.model("RouteDirection", routeDirectionSchema);
