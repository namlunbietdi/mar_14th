const express = require("express");
const archiver = require("archiver");
const Device = require("../models/Device");
const DeviceAssignment = require("../models/DeviceAssignment");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapDevice } = require("../utils/mappers");
const { buildRouteRuntimeConfig } = require("../services/runtime-config");
const { buildDeviceSdPackage, resolveRouteIdsForDevice } = require("../services/sd-package");

const router = express.Router();

function parseConfigVersion(value, fallback = 1) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return Math.trunc(numericValue);
  }
  return Math.trunc(Number(fallback) || 1);
}

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
      status,
      configVersion: parseConfigVersion(req.body.configVersion, 1)
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
        status,
        configVersion: parseConfigVersion(req.body.configVersion, 1)
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
      configVersion: parseConfigVersion(req.query.configVersion, device.configVersion || 1),
      generatedAt: new Date().toISOString(),
      config: {
        ...config,
        device: {
          id: device._id,
          deviceId: device.deviceId,
          configVersion: parseConfigVersion(req.query.configVersion, device.configVersion || 1),
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

    const effectiveConfigVersion = parseConfigVersion(req.query.configVersion, device.configVersion || 1);
    const sdPackage = await buildDeviceSdPackage(device, {
      ...req.query,
      configVersion: effectiveConfigVersion
    });

    if (!sdPackage) {
      return res.status(400).json({
        success: false,
        message: "Khong co du lieu route de xuat goi SD."
      });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sd-package-${device.deviceId}-v${sdPackage.system.configVersion}.zip"`
    );
    res.setHeader("X-SD-Missing-Audio-Count", "0");

    const archive = archiver("zip", { zlib: { level: 9 } });
    await new Promise((resolve, reject) => {
      const onArchiveError = (error) => {
        cleanup();
        reject(error);
      };

      const onResponseClose = () => {
        cleanup();
        if (!res.writableEnded) {
          reject(new Error("RESPONSE_CLOSED"));
        }
      };

      const onResponseFinish = () => {
        cleanup();
        resolve();
      };

      function cleanup() {
        archive.removeListener("error", onArchiveError);
        res.removeListener("close", onResponseClose);
        res.removeListener("finish", onResponseFinish);
      }

      archive.on("error", onArchiveError);
      res.on("close", onResponseClose);
      res.on("finish", onResponseFinish);

      archive.pipe(res);

      archive.append(JSON.stringify(sdPackage.system, null, 2), { name: "CONFIG/system.json" });
      archive.append(JSON.stringify(sdPackage.audioMap, null, 2), { name: "CONFIG/audio-map.json" });

      sdPackage.routeFiles.forEach((item) => {
        archive.append(JSON.stringify(item.content, null, 2), { name: `ROUTES/${item.fileName}` });
      });

      archive.append("", { name: "AUDIO/STOPS/" });
      archive.append("", { name: "AUDIO/ROUTES/" });
      archive.append("", { name: "AUDIO/COMMON/" });

      archive.finalize().catch((error) => {
        cleanup();
        reject(error);
      });
    });

    return undefined;
  } catch (error) {
    if (res.headersSent) {
      return undefined;
    }

    return res.status(500).json({
      success: false,
      message: "Khong the xuat goi SD."
    });
  }
});

module.exports = router;
