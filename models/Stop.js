const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema(
  {
    stopCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    stopName: {
      type: String,
      required: true,
      trim: true
    },
    longitude: {
      type: Number,
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    servedRoutes: [
      {
        routeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Route",
          required: true
        },
        outbound: {
          type: Boolean,
          default: false
        },
        inbound: {
          type: Boolean,
          default: false
        }
      }
    ],
    routeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Route"
      }
    ],
    isEndpoint: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Stop", stopSchema);
