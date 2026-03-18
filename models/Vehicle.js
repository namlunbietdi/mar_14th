const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    vehicleTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleType",
      required: true
    },
    operationStartDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "maintenance", "stopped"],
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
