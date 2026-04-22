const express = require("express");
const mongoose = require("mongoose");
const Route = require("../models/Route");
const Stop = require("../models/Stop");
const RouteDirection = require("../models/RouteDirection");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { buildLegacyRouteDirectionFromStops } = require("../services/runtime-config");

const router = express.Router();

function isValidDirection(direction) {
  return direction === "outbound" || direction === "inbound";
}

function normalizeStopsPayload(stops) {
  if (!Array.isArray(stops)) {
    return [];
  }

  const normalized = stops
    .map((item, index) => ({
      stopId: String(item.stopId || "").trim(),
      order: Number(item.order || index + 1),
      isTerminal: Boolean(item.isTerminal),
      audioId: String(item.audioId || "").trim()
    }))
    .filter((item) => mongoose.Types.ObjectId.isValid(item.stopId) && Number.isFinite(item.order) && item.order > 0);

  const duplicatedOrders = normalized
    .map((item) => item.order)
    .filter((order, index, arr) => arr.indexOf(order) !== index);

  if (duplicatedOrders.length) {
    throw new Error("Thu tu diem dung bi trung lap.");
  }

  return normalized.sort((a, b) => a.order - b.order);
}

async function ensureRouteExists(routeId) {
  const route = await Route.findById(routeId);
  if (!route) {
    throw new Error("Khong tim thay tuyen.");
  }
}

function mapDirectionStops(stops = []) {
  return stops
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      stopId: item.stopId?._id || item.stopId,
      stopCode: item.stopId?.stopCode || "",
      stopName: item.stopId?.stopName || "",
      latitude: item.stopId?.latitude ?? null,
      longitude: item.stopId?.longitude ?? null,
      order: item.order,
      isTerminal: Boolean(item.isTerminal),
      audioId: item.audioId || item.stopId?.stopCode || ""
    }));
}

router.get("/:routeId/:direction", requireAuth, async (req, res) => {
  const { routeId, direction } = req.params;

  if (!mongoose.Types.ObjectId.isValid(routeId)) {
    return res.status(400).json({ success: false, message: "Route ID khong hop le." });
  }

  if (!isValidDirection(direction)) {
    return res.status(400).json({ success: false, message: "Huong tuyen khong hop le." });
  }

  try {
    await ensureRouteExists(routeId);

    const directionDoc = await RouteDirection.findOne({ routeId, direction }).populate("stops.stopId");
    let stops = directionDoc ? directionDoc.stops : await buildLegacyRouteDirectionFromStops(routeId, direction);

    if (!directionDoc && stops.length) {
      const legacyStopDocs = await Stop.find({ _id: { $in: stops.map((item) => item.stopId) } });
      const stopMap = new Map(legacyStopDocs.map((stop) => [String(stop._id), stop]));
      stops = stops.map((item) => ({
        ...item,
        stopId: stopMap.get(String(item.stopId)) || item.stopId
      }));
    }

    return res.json({
      success: true,
      direction: {
        id: directionDoc?._id || null,
        routeId,
        direction,
        version: directionDoc?.version || 1,
        updatedAt: directionDoc?.updatedAt || null,
        stops: mapDirectionStops(stops)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Khong the tai cau hinh thu tu diem dung."
    });
  }
});

router.put("/:routeId/:direction", requireAdmin, async (req, res) => {
  const { routeId, direction } = req.params;

  if (!mongoose.Types.ObjectId.isValid(routeId)) {
    return res.status(400).json({ success: false, message: "Route ID khong hop le." });
  }

  if (!isValidDirection(direction)) {
    return res.status(400).json({ success: false, message: "Huong tuyen khong hop le." });
  }

  try {
    await ensureRouteExists(routeId);
    const stops = normalizeStopsPayload(req.body.stops);
    const stopIds = stops.map((item) => item.stopId);
    const existingStops = await Stop.find({ _id: { $in: stopIds } }).select("_id");

    if (existingStops.length !== stopIds.length) {
      return res.status(400).json({
        success: false,
        message: "Danh sach diem dung co ID khong ton tai."
      });
    }

    const existingDirection = await RouteDirection.findOne({ routeId, direction }).select("version");
    const providedVersion = Number(req.body.version || 0);
    const computedVersion = existingDirection ? existingDirection.version + 1 : 1;

    const directionDoc = await RouteDirection.findOneAndUpdate(
      { routeId, direction },
      {
        routeId,
        direction,
        stops,
        version: Number.isFinite(providedVersion) && providedVersion > 0 ? providedVersion : computedVersion
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    ).populate("stops.stopId");

    return res.json({
      success: true,
      message: "Da cap nhat thu tu diem dung theo huong tuyen.",
      direction: {
        id: directionDoc._id,
        routeId: directionDoc.routeId,
        direction: directionDoc.direction,
        version: directionDoc.version,
        updatedAt: directionDoc.updatedAt,
        stops: mapDirectionStops(directionDoc.stops)
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Khong the cap nhat thu tu diem dung."
    });
  }
});

module.exports = router;
