const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    birthDate: {
      type: Date,
      required: true
    },
    position: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["working", "left"],
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Employee", employeeSchema);
