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
      message: "Không thể lay danh sach điểm dừng."
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
      message: "Không thể tao ma điểm dừng."
    });
  }
});

router.get("/export", requireAuth, async (req, res) => {
  try {
    const stops = await Stop.find()
      .populate("routeIds")
      .populate("servedRoutes.routeId")
      .sort({ stopCode: 1 });
    const header = ["Ma điểm dừng", "Ten điểm dừng", "Kinh do", "Vi do", "Cac tuyến di qua", "La diem dau/cuoi"];
    const rows = stops.map((stop) => {
      const mappedStop = mapStop(stop);
      return [
        mappedStop.stopCode,
        mappedStop.stopName,
        mappedStop.longitude,
        mappedStop.latitude,
        mappedStop.routeNumbers.join("; "),
        mappedStop.isEndpoint ? "Co" : "Không"
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
      message: "Không thể export danh sach điểm dừng."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { stopName, longitude, latitude, servedRoutes, isEndpoint } = req.body;

  try {
    if (!stopName || longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhap day du thông tin điểm dừng."
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
      message: "Đã thêm điểm dừng moi.",
      stop: mapStop(populatedStop)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể them điểm dừng."
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
        message: "Không tìm thấy điểm dừng."
      });
    }

    return res.json({
      success: true,
      message: "Đã cập nhật điểm dừng.",
      stop: mapStop(stop)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể cap nhat điểm dừng."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const stop = await Stop.findByIdAndDelete(req.params.id);

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy điểm dừng."
      });
    }

    return res.json({
      success: true,
      message: "Đã xóa điểm dừng."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể xoa điểm dừng."
    });
  }
});

module.exports = router;

