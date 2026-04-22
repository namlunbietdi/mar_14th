const mongoose = require("mongoose");
const DeviceAssignment = require("../models/DeviceAssignment");
const DispatchOrder = require("../models/DispatchOrder");
const RouteDirection = require("../models/RouteDirection");
const { buildRouteRuntimeConfig } = require("./runtime-config");

function normalizeRouteIds(routeIds = []) {
  return [...new Set(routeIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => String(id)))];
}

async function resolveRouteIdsForDevice(deviceId, query = {}) {
  const routeIdsFromQuery = normalizeRouteIds(
    [
      ...(String(query.routeId || "").trim() ? [String(query.routeId).trim()] : []),
      ...String(query.routeIds || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ]
  );

  if (routeIdsFromQuery.length) {
    return routeIdsFromQuery;
  }

  const activeAssignment = await DeviceAssignment.findOne({
    deviceId,
    isActive: true
  })
    .sort({ assignedAt: -1 })
    .populate("dispatchOrderId");

  if (activeAssignment?.dispatchOrderId?.routeId) {
    return [String(activeAssignment.dispatchOrderId.routeId)];
  }

  const latestOrderWithDevice = await DeviceAssignment.findOne({
    deviceId,
    dispatchOrderId: { $ne: null }
  }).sort({ assignedAt: -1 });

  if (latestOrderWithDevice?.dispatchOrderId) {
    const dispatchOrder = await DispatchOrder.findById(latestOrderWithDevice.dispatchOrderId).select("routeId");
    if (dispatchOrder?.routeId) {
      return [String(dispatchOrder.routeId)];
    }
  }

  const configuredRouteIds = await RouteDirection.distinct("routeId");
  return normalizeRouteIds(configuredRouteIds.map((id) => String(id)));
}

async function buildDeviceSdPackage(device, query = {}) {
  const routeIds = await resolveRouteIdsForDevice(device._id, query);
  const routeConfigs = [];

  for (const routeId of routeIds) {
    const config = await buildRouteRuntimeConfig(routeId);
    if (config && (config.outbound.length || config.inbound.length)) {
      routeConfigs.push(config);
    }
  }

  if (!routeConfigs.length) {
    return null;
  }

  const defaultRoute = routeConfigs[0].route.routeNumber;
  const audioMapEntries = new Map();

  routeConfigs.forEach((config) => {
    [...config.outbound, ...config.inbound].forEach((stop) => {
      if (!stop.audio) return;
      audioMapEntries.set(stop.audio, `${stop.audio}.mp3`);
    });
  });

  const system = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    deviceId: device.deviceId,
    defaultRoute,
    routes: routeConfigs.map((config) => config.route.routeNumber)
  };

  const audioMap = Object.fromEntries([...audioMapEntries.entries()].sort(([a], [b]) => a.localeCompare(b)));

  const routeFiles = routeConfigs.map((config) => ({
    fileName: `route_${config.route.routeNumber}.json`,
    content: config
  }));

  return {
    system,
    audioMap,
    routeFiles
  };
}

module.exports = {
  buildDeviceSdPackage,
  resolveRouteIdsForDevice
};
