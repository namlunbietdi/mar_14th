const express = require("express");
const Vehicle = require("../models/Vehicle");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapVehicle } = require("../utils/mappers");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate("vehicleTypeId").sort({ licensePlate: 1 });

    return res.json({
      success: true,
      vehicles: vehicles.map(mapVehicle)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể lay danh sach phương tiện."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { licensePlate, vehicleTypeId, operationStartDate, status } = req.body;

  try {
    if (!licensePlate || !vehicleTypeId || !operationStartDate || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhap day du thông tin phương tiện."
      });
    }

    const vehicle = await Vehicle.create({
      licensePlate: String(licensePlate).trim(),
      vehicleTypeId,
      operationStartDate,
      status
    });

    const populatedVehicle = await Vehicle.findById(vehicle._id).populate("vehicleTypeId");

    return res.status(201).json({
      success: true,
      message: "Đã thêm phương tiện moi.",
      vehicle: mapVehicle(populatedVehicle)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể them phương tiện."
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { licensePlate, vehicleTypeId, operationStartDate, status } = req.body;

  try {
    if (!licensePlate || !vehicleTypeId || !operationStartDate || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhap day du thông tin phương tiện."
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      {
        licensePlate: String(licensePlate).trim(),
        vehicleTypeId,
        operationStartDate,
        status
      },
      {
        new: true,
        runValidators: true
      }
    ).populate("vehicleTypeId");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phương tiện."
      });
    }

    return res.json({
      success: true,
      message: "Đã cập nhật phương tiện.",
      vehicle: mapVehicle(vehicle)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể cap nhat phương tiện."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phương tiện."
      });
    }

    return res.json({
      success: true,
      message: "Đã xóa phương tiện."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể xoa phương tiện."
    });
  }
});

module.exports = router;

