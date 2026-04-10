const express = require("express");
const Device = require("../models/Device");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapDevice } = require("../utils/mappers");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      devices: devices.map(mapDevice)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the lay danh sach thiet bi."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { deviceId, operationStartDate, status } = req.body;

  try {
    if (!deviceId || !operationStartDate || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin thiet bi."
      });
    }

    const existingDevice = await Device.findOne({ deviceId: String(deviceId || "").trim() });

    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: "ID thiet bi da ton tai."
      });
    }

    const device = await Device.create({
      deviceId: String(deviceId || "").trim(),
      operationStartDate,
      status
    });

    return res.status(201).json({
      success: true,
      message: "Da them thiet bi moi.",
      device: mapDevice(device)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the them thiet bi."
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { deviceId, operationStartDate, status } = req.body;

  try {
    if (!deviceId || !operationStartDate || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin thiet bi."
      });
    }

    const existingDevice = await Device.findOne({
      deviceId: String(deviceId || "").trim(),
      _id: { $ne: req.params.id }
    });

    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: "ID thiet bi da ton tai."
      });
    }

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      {
        deviceId: String(deviceId || "").trim(),
        operationStartDate,
        status
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay thiet bi."
      });
    }

    return res.json({
      success: true,
      message: "Da cap nhat thiet bi.",
      device: mapDevice(device)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the cap nhat thiet bi."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay thiet bi."
      });
    }

    return res.json({
      success: true,
      message: "Da xoa thiet bi."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the xoa thiet bi."
    });
  }
});

module.exports = router;
