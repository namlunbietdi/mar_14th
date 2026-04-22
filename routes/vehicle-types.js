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
      message: "Không thể lay danh sach loai phương tiện."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { brand, modelName, capacity } = req.body;

  try {
    if (!brand || !modelName || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhap day du thông tin loai phương tiện."
      });
    }

    const vehicleType = await VehicleType.create({
      brand: String(brand).trim(),
      modelName: String(modelName).trim(),
      capacity: Number(capacity)
    });

    return res.status(201).json({
      success: true,
      message: "Đã thêm loai phương tiện.",
      vehicleType: mapVehicleType(vehicleType)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể them loai phương tiện."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const linkedVehicle = await Vehicle.findOne({ vehicleTypeId: req.params.id });

    if (linkedVehicle) {
      return res.status(400).json({
        success: false,
        message: "Không thể xoa loai phương tiện da duoc gan cho phương tiện."
      });
    }

    const vehicleType = await VehicleType.findByIdAndDelete(req.params.id);

    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loai phương tiện."
      });
    }

    return res.json({
      success: true,
      message: "Đã xóa loai phương tiện."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể xoa loai phương tiện."
    });
  }
});

module.exports = router;

