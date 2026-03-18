const mongoose = require("mongoose");

const vehicleTypeSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true
    },
    modelName: {
      type: String,
      required: true,
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

vehicleTypeSchema.index({ brand: 1, modelName: 1 }, { unique: true });

module.exports = mongoose.model("VehicleType", vehicleTypeSchema);
