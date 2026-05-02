const Device = require("../models/Device");
const DeviceAssignment = require("../models/DeviceAssignment");
const DeviceEventLog = require("../models/DeviceEventLog");
const DeviceLastState = require("../models/DeviceLastState");
const LocationLog = require("../models/LocationLog");

const SUPPORTED_EVENT_TYPES = new Set([
  "ROUTE_SELECTED",
  "ROUTE_CHANGED",
  "APPROACHING_STOP",
  "ARRIVED_STOP",
  "LEAVING_STOP",
  "STOP_SKIPPED",
  "DIRECTION_CHANGED",
  "REACHED_TERMINAL",
  "GPS_LOST",
  "GPS_RESTORED",
  "NETWORK_LOST",
  "NETWORK_RESTORED",
  "CONFIG_LOADED",
  "BOOT_COMPLETED"
]);

function normalizeDeviceCode(payload, topic = "") {
  const fromPayload = payload.deviceId || payload.deviceCode || payload.id;
  if (fromPayload) return String(fromPayload).trim().toUpperCase();
  const topicParts = String(topic || "").split("/").filter(Boolean);
  return topicParts.length >= 2 ? topicParts[1].trim().toUpperCase() : "";
}

function normalizeCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function normalizeTimestamp(value) {
  const timestamp = value || new Date().toISOString();
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Timestamp khong hop le.");
  }
  return parsed;
}

async function resolveDeviceContext(deviceCode) {
  const device = await Device.findOne({ deviceId: deviceCode });
  if (!device) {
    throw new Error(`Khong tim thay thiet bi ${deviceCode} trong he thong.`);
  }

  const activeAssignment = await DeviceAssignment.findOne({
    deviceId: device._id,
    isActive: true
  }).sort({ assignedAt: -1 });

  return { device, activeAssignment };
}

function normalizeTelemetryPayload(payload, topic = "") {
  const deviceCode = normalizeDeviceCode(payload, topic);
  const latitude = normalizeCoordinate(payload.latitude ?? payload.lat);
  const longitude = normalizeCoordinate(payload.longitude ?? payload.lng ?? payload.lon);

  if (!deviceCode) throw new Error("Thieu deviceId trong payload MQTT.");
  if (latitude === null || longitude === null) throw new Error("Payload MQTT thieu lat/lon hop le.");

  return {
    deviceCode,
    latitude,
    longitude,
    speed: normalizeCoordinate(payload.speed) ?? 0,
    heading: normalizeCoordinate(payload.heading ?? payload.course),
    altitude: normalizeCoordinate(payload.altitude),
    ignition: normalizeBoolean(payload.ignition),
    satellites: normalizeCoordinate(payload.satellites),
    gpsFix: normalizeBoolean(payload.gpsFix),
    routeNumber: String(payload.routeNumber || "").trim(),
    direction: String(payload.direction || "").trim().toLowerCase(),
    currentStopCode: String(payload.currentStopCode || "").trim(),
    nextStopCode: String(payload.nextStopCode || "").trim(),
    status: String(payload.status || "").trim(),
    configVersion: normalizeCoordinate(payload.configVersion),
    rssi: normalizeCoordinate(payload.rssi),
    gpsTime: normalizeTimestamp(payload.ts || payload.gpsTime || payload.timestamp || payload.time)
  };
}

function normalizeEventPayload(payload, topic = "") {
  const deviceCode = normalizeDeviceCode(payload, topic);
  const eventType = String(payload.eventType || "").trim().toUpperCase();

  if (!deviceCode) throw new Error("Thieu deviceId trong payload event.");
  if (!eventType) throw new Error("Thieu eventType trong payload event.");
  if (!SUPPORTED_EVENT_TYPES.has(eventType)) throw new Error(`eventType khong duoc ho tro: ${eventType}`);

  return {
    deviceCode,
    eventType,
    routeNumber: String(payload.routeNumber || "").trim(),
    direction: String(payload.direction || "").trim().toLowerCase(),
    stopCode: String(payload.stopCode || "").trim(),
    latitude: normalizeCoordinate(payload.latitude ?? payload.lat),
    longitude: normalizeCoordinate(payload.longitude ?? payload.lng ?? payload.lon),
    eventTime: normalizeTimestamp(payload.ts || payload.timestamp || payload.time),
    details: payload.details && typeof payload.details === "object" ? payload.details : null
  };
}

async function ingestTelemetryPayload(payload, topic = "") {
  const telemetry = normalizeTelemetryPayload(payload, topic);
  const { device, activeAssignment } = await resolveDeviceContext(telemetry.deviceCode);

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
    satellites: telemetry.satellites,
    gpsFix: telemetry.gpsFix,
    routeNumber: telemetry.routeNumber,
    direction: ["outbound", "inbound"].includes(telemetry.direction) ? telemetry.direction : "",
    currentStopCode: telemetry.currentStopCode,
    nextStopCode: telemetry.nextStopCode,
    status: telemetry.status,
    configVersion: telemetry.configVersion,
    rssi: telemetry.rssi,
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
      satellites: telemetry.satellites,
      gpsFix: telemetry.gpsFix,
      routeNumber: telemetry.routeNumber,
      direction: ["outbound", "inbound"].includes(telemetry.direction) ? telemetry.direction : "",
      currentStopCode: telemetry.currentStopCode,
      nextStopCode: telemetry.nextStopCode,
      status: telemetry.status,
      configVersion: telemetry.configVersion,
      rssi: telemetry.rssi,
      lastGpsTime: telemetry.gpsTime,
      lastReceivedAt: new Date(),
      connectionStatus: "online"
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    type: "telemetry",
    locationLogId: locationLog._id,
    deviceCode: telemetry.deviceCode
  };
}

async function ingestEventPayload(payload, topic = "") {
  const event = normalizeEventPayload(payload, topic);
  const { device, activeAssignment } = await resolveDeviceContext(event.deviceCode);

  const eventLog = await DeviceEventLog.create({
    deviceId: device._id,
    deviceCode: event.deviceCode,
    vehicleId: activeAssignment?.vehicleId || null,
    dispatchOrderId: activeAssignment?.dispatchOrderId || null,
    eventType: event.eventType,
    routeNumber: event.routeNumber,
    direction: ["outbound", "inbound"].includes(event.direction) ? event.direction : "",
    stopCode: event.stopCode,
    latitude: event.latitude,
    longitude: event.longitude,
    eventTime: event.eventTime,
    receivedAt: new Date(),
    details: event.details,
    topic,
    rawPayload: payload
  });

  await DeviceLastState.findOneAndUpdate(
    { deviceId: device._id },
    {
      deviceId: device._id,
      deviceCode: event.deviceCode,
      vehicleId: activeAssignment?.vehicleId || null,
      dispatchOrderId: activeAssignment?.dispatchOrderId || null,
      routeNumber: event.routeNumber,
      direction: ["outbound", "inbound"].includes(event.direction) ? event.direction : "",
      currentStopCode: event.stopCode || undefined,
      lastReceivedAt: new Date(),
      connectionStatus: "online"
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    type: "event",
    eventLogId: eventLog._id,
    deviceCode: event.deviceCode,
    eventType: event.eventType
  };
}

async function ingestMqttPayload(payload, topic = "") {
  if (String(topic).endsWith("/event")) {
    return ingestEventPayload(payload, topic);
  }
  return ingestTelemetryPayload(payload, topic);
}

module.exports = {
  ingestEventPayload,
  ingestMqttPayload,
  ingestTelemetryPayload,
  normalizeEventPayload,
  normalizeTelemetryPayload
};
