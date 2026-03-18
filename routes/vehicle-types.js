const express = require("express");
const VehicleType = require("../models/VehicleType");
const Vehicle = require("../models/Vehicle");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapVehicleType } = require("../utils/mappers");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const vehicleTypes = await VehicleType.find().sort({ brand: 1, modelName: 1 });

    return res.json({
      success: true,
      vehicleTypes: vehicleTypes.map(mapVehicleType)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the lay danh sach loai phuong tien."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { brand, modelName, capacity } = req.body;

  try {
    if (!brand || !modelName || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin loai phuong tien."
      });
    }

    const vehicleType = await VehicleType.create({
      brand: String(brand).trim(),
      modelName: String(modelName).trim(),
      capacity: Number(capacity)
    });

    return res.status(201).json({
      success: true,
      message: "Da them loai phuong tien.",
      vehicleType: mapVehicleType(vehicleType)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the them loai phuong tien."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const linkedVehicle = await Vehicle.findOne({ vehicleTypeId: req.params.id });

    if (linkedVehicle) {
      return res.status(400).json({
        success: false,
        message: "Khong the xoa loai phuong tien da duoc gan cho phuong tien."
      });
    }

    const vehicleType = await VehicleType.findByIdAndDelete(req.params.id);

    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay loai phuong tien."
      });
    }

    return res.json({
      success: true,
      message: "Da xoa loai phuong tien."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the xoa loai phuong tien."
    });
  }
});

module.exports = router;
