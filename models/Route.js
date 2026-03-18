const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    routeNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    routeName: {
      type: String,
      required: true,
      trim: true
    },
    startPoint: {
      type: String,
      required: true,
      trim: true
    },
    endPoint: {
      type: String,
      required: true,
      trim: true
    },
    operatingVehicleCount: {
      type: Number,
      required: true,
      min: 0
    },
    reserveVehicleCount: {
      type: Number,
      required: true,
      min: 0
    },
    outboundGeoJson: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    inboundGeoJson: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Route", routeSchema);
