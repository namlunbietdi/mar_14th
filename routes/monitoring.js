﻿const express = require("express");
const Device = require("../models/Device");
const DeviceAssignment = require("../models/DeviceAssignment");
const DeviceLastState = require("../models/DeviceLastState");
const LocationLog = require("../models/LocationLog");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapLocationLog, mapMonitoringSnapshot } = require("../utils/mappers");
const { ingestMqttPayload } = require("../services/mqtt-ingest");

const router = express.Router();

router.get("/live", requireAuth, async (req, res) => {
  try {
    const offlineSeconds = Number(req.query.offlineSeconds || process.env.MONITORING_OFFLINE_SECONDS || 120);
    const states = await DeviceLastState.find()
      .populate("deviceId")
      .populate("vehicleId")
      .populate({
        path: "dispatchOrderId",
        populate: {
          path: "routeId"
        }
      })
      .sort({ lastReceivedAt: -1 });

    const items = states.map((state) => mapMonitoringSnapshot(state, offlineSeconds));

    return res.json({
      success: true,
      summary: {
        total: items.length,
        online: items.filter((item) => item.connectionStatus === "online").length,
        offline: items.filter((item) => item.connectionStatus === "offline").length
      },
      items
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể tai du lieu giám sát trực tiếp."
    });
  }
});

router.get("/history", requireAuth, async (req, res) => {
  try {
    const deviceCode = String(req.query.deviceId || "").trim().toUpperCase();
    const vehicleId = String(req.query.vehicleId || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 200);
    const query = {};

    if (deviceCode) {
      query.deviceCode = deviceCode;
    }

    if (vehicleId) {
      query.vehicleId = vehicleId;
    }

    const logs = await LocationLog.find(query)
      .populate("vehicleId")
      .populate("dispatchOrderId")
      .sort({ gpsTime: -1 })
      .limit(limit);

    return res.json({
      success: true,
      logs: logs.map(mapLocationLog)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể tai lịch sử giám sát."
    });
  }
});

router.get("/unassigned-devices", requireAuth, async (req, res) => {
  try {
    const activeAssignments = await DeviceAssignment.find({ isActive: true }).select("deviceId");
    const assignedDeviceIds = activeAssignments.map((assignment) => assignment.deviceId);
    const devices = await Device.find({
      _id: { $nin: assignedDeviceIds },
      status: { $ne: "removed" }
    }).sort({ deviceId: 1 });

    return res.json({
      success: true,
      devices: devices.map((device) => ({
        id: device._id,
        deviceId: device.deviceId,
        status: device.status
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể tai danh sach thiết bị chua duoc gan."
    });
  }
});

router.post("/ingest", requireAdmin, async (req, res) => {
  try {
    const topic = String(req.body.topic || "manual/testing").trim();
    const payload = req.body.payload && typeof req.body.payload === "object"
      ? req.body.payload
      : req.body;

    const result = await ingestMqttPayload(payload, topic);

    return res.status(201).json({
      success: true,
      message: "Da ghi nhan ban tin MQTT.",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không thể xu ly bản tin telemetry."
    });
  }
});

module.exports = router;

