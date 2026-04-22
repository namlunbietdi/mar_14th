const express = require("express");
const Device = require("../models/Device");
const DeviceAssignment = require("../models/DeviceAssignment");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapDevice } = require("../utils/mappers");
const { buildRouteRuntimeConfig } = require("../services/runtime-config");
const { buildDeviceSdPackage, resolveRouteIdsForDevice } = require("../services/sd-package");

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

router.get("/:id/runtime-config", requireAuth, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay thiet bi."
      });
    }

    let routeId = String(req.query.routeId || "").trim();

    if (!routeId) {
      const routeIds = await resolveRouteIdsForDevice(device._id, req.query);
      routeId = routeIds[0] || "";
    }

    if (!routeId) {
      return res.status(400).json({
        success: false,
        message: "Khong xac dinh duoc tuyen cho thiet bi."
      });
    }

    const config = await buildRouteRuntimeConfig(routeId);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay route de tao runtime config."
      });
    }

    const activeAssignment = await DeviceAssignment.findOne({
      deviceId: device._id,
      isActive: true
    }).sort({ assignedAt: -1 });

    return res.json({
      success: true,
      config: {
        ...config,
        device: {
          id: device._id,
          deviceId: device.deviceId,
          activeAssignmentId: activeAssignment?._id || null
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the tao runtime config cho thiet bi."
    });
  }
});

router.get("/:id/sd-package", requireAuth, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay thiet bi."
      });
    }

    const sdPackage = await buildDeviceSdPackage(device, req.query);

    if (!sdPackage) {
      return res.status(400).json({
        success: false,
        message: "Khong co du lieu route de xuat goi SD."
      });
    }

    const packagePayload = {
      system: sdPackage.system,
      files: {
        "system.json": sdPackage.system,
        "audio-map.json": sdPackage.audioMap,
        ...Object.fromEntries(sdPackage.routeFiles.map((item) => [item.fileName, item.content]))
      }
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="sd-package-${device.deviceId}.json"`);
    return res.send(JSON.stringify(packagePayload, null, 2));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the xuat goi SD."
    });
  }
});

module.exports = router;
