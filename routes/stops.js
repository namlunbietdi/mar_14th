const express = require("express");
const Stop = require("../models/Stop");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { getNextStopCode, peekNextStopCode } = require("../utils/codes");
const { escapeCsvValue } = require("../utils/csv");
const { mapStop } = require("../utils/mappers");
const { normalizeStopServedRoutes } = require("../utils/stops");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const stops = await Stop.find()
      .populate("routeIds")
      .populate("servedRoutes.routeId")
      .sort({ stopCode: 1 });

    return res.json({
      success: true,
      stops: stops.map(mapStop)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the lay danh sach diem dung."
    });
  }
});

router.get("/next-code", requireAdmin, async (req, res) => {
  try {
    const stopCode = await peekNextStopCode();

    return res.json({
      success: true,
      stopCode
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the tao ma diem dung."
    });
  }
});

router.get("/export", requireAuth, async (req, res) => {
  try {
    const stops = await Stop.find()
      .populate("routeIds")
      .populate("servedRoutes.routeId")
      .sort({ stopCode: 1 });
    const header = ["Ma diem dung", "Ten diem dung", "Kinh do", "Vi do", "Cac tuyen di qua", "La diem dau/cuoi"];
    const rows = stops.map((stop) => {
      const mappedStop = mapStop(stop);
      return [
        mappedStop.stopCode,
        mappedStop.stopName,
        mappedStop.longitude,
        mappedStop.latitude,
        mappedStop.routeNumbers.join("; "),
        mappedStop.isEndpoint ? "Co" : "Khong"
      ];
    });

    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="danh-sach-diem-dung.csv"');
    return res.send(`\uFEFF${csvContent}`);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the export danh sach diem dung."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { stopName, longitude, latitude, servedRoutes, isEndpoint } = req.body;

  try {
    if (!stopName || longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin diem dung."
      });
    }

    const stopCode = await getNextStopCode();
    const stop = await Stop.create({
      stopCode,
      stopName: String(stopName).trim(),
      longitude: Number(longitude),
      latitude: Number(latitude),
      servedRoutes: normalizeStopServedRoutes(servedRoutes),
      routeIds: [],
      isEndpoint: Boolean(isEndpoint)
    });

    const populatedStop = await Stop.findById(stop._id).populate("routeIds").populate("servedRoutes.routeId");

    return res.status(201).json({
      success: true,
      message: "Da them diem dung moi.",
      stop: mapStop(populatedStop)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the them diem dung."
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { stopName, longitude, latitude, servedRoutes, isEndpoint } = req.body;

  try {
    const stop = await Stop.findByIdAndUpdate(
      req.params.id,
      {
        stopName: String(stopName).trim(),
        longitude: Number(longitude),
        latitude: Number(latitude),
        servedRoutes: normalizeStopServedRoutes(servedRoutes),
        routeIds: [],
        isEndpoint: Boolean(isEndpoint)
      },
      {
        new: true,
        runValidators: true
      }
    ).populate("routeIds").populate("servedRoutes.routeId");

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay diem dung."
      });
    }

    return res.json({
      success: true,
      message: "Da cap nhat diem dung.",
      stop: mapStop(stop)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the cap nhat diem dung."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const stop = await Stop.findByIdAndDelete(req.params.id);

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay diem dung."
      });
    }

    return res.json({
      success: true,
      message: "Da xoa diem dung."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the xoa diem dung."
    });
  }
});

module.exports = router;
