const Device = require("../models/Device");
const DeviceAssignment = require("../models/DeviceAssignment");
const DeviceLastState = require("../models/DeviceLastState");
const LocationLog = require("../models/LocationLog");

function normalizeDeviceCode(payload, topic = "") {
  const fromPayload = payload.deviceId || payload.deviceCode || payload.id;

  if (fromPayload) {
    return String(fromPayload).trim().toUpperCase();
  }

  const topicParts = String(topic || "").split("/").filter(Boolean);
  return topicParts.length >= 2 ? topicParts[1].trim().toUpperCase() : "";
}

function normalizeCoordinate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function normalizeTelemetryPayload(payload, topic = "") {
  const deviceCode = normalizeDeviceCode(payload, topic);
  const latitude = normalizeCoordinate(payload.latitude ?? payload.lat);
  const longitude = normalizeCoordinate(payload.longitude ?? payload.lng ?? payload.lon);
  const speed = normalizeCoordinate(payload.speed) ?? 0;
  const heading = normalizeCoordinate(payload.heading ?? payload.course);
  const altitude = normalizeCoordinate(payload.altitude);
  const ignition = normalizeBoolean(payload.ignition);
  const gpsTime = payload.gpsTime || payload.timestamp || payload.time || new Date().toISOString();

  if (!deviceCode) {
    throw new Error("Thieu deviceId trong payload MQTT.");
  }

  if (latitude === null || longitude === null) {
    throw new Error("Payload MQTT thieu latitude/longitude hop le.");
  }

  const parsedGpsTime = new Date(gpsTime);

  if (Number.isNaN(parsedGpsTime.getTime())) {
    throw new Error("gpsTime không hợp lệ.");
  }

  return {
    deviceCode,
    latitude,
    longitude,
    speed,
    heading,
    altitude,
    ignition,
    gpsTime: parsedGpsTime
  };
}

async function ingestTelemetryPayload(payload, topic = "") {
  const telemetry = normalizeTelemetryPayload(payload, topic);
  const device = await Device.findOne({ deviceId: telemetry.deviceCode });

  if (!device) {
    throw new Error(`Không tìm thấy thiết bị ${telemetry.deviceCode} trong he thong.`);
  }

  const activeAssignment = await DeviceAssignment.findOne({
    deviceId: device._id,
    isActive: true
  }).sort({ assignedAt: -1 });

  const locationLog = await LocationLog.create({
    deviceId: device._id,
    deviceCode: telemetry.deviceCode,
    vehicleId: activeAssignment?.vehicleId || null,
    dispatchOrderId: activeAssignment?.dispatchOrderId || null,
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    speed: telemetry.speed,
    heading: telemetry.heading,
    altitude: telemetry.altitude,
    ignition: telemetry.ignition,
    gpsTime: telemetry.gpsTime,
    receivedAt: new Date(),
    topic,
    rawPayload: payload
  });

  await DeviceLastState.findOneAndUpdate(
    { deviceId: device._id },
    {
      deviceId: device._id,
      deviceCode: telemetry.deviceCode,
      vehicleId: activeAssignment?.vehicleId || null,
      dispatchOrderId: activeAssignment?.dispatchOrderId || null,
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
      speed: telemetry.speed,
      heading: telemetry.heading,
      ignition: telemetry.ignition,
      lastGpsTime: telemetry.gpsTime,
      lastReceivedAt: new Date(),
      connectionStatus: "online"
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return {
    locationLogId: locationLog._id,
    deviceCode: telemetry.deviceCode,
    matchedVehicleId: activeAssignment?.vehicleId || null,
    matchedDispatchOrderId: activeAssignment?.dispatchOrderId || null
  };
}

module.exports = {
  ingestTelemetryPayload,
  normalizeTelemetryPayload
};

