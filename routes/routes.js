const express = require("express");
const Route = require("../models/Route");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapRoute } = require("../utils/mappers");
const { buildRouteRuntimeConfig } = require("../services/runtime-config");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const routes = await Route.find().sort({ routeNumber: 1 });

    return res.json({
      success: true,
      routes: routes.map(mapRoute)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể lay danh sach tuyến."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { routeNumber, routeName, startPoint, endPoint, operatingVehicleCount, reserveVehicleCount } = req.body;

  try {
    if (!routeNumber || !routeName || !startPoint || !endPoint) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhap day du thông tin tuyến."
      });
    }

    const route = await Route.create({
      routeNumber: String(routeNumber).trim(),
      routeName: String(routeName).trim(),
      startPoint: String(startPoint).trim(),
      endPoint: String(endPoint).trim(),
      operatingVehicleCount: Number(operatingVehicleCount || 0),
      reserveVehicleCount: Number(reserveVehicleCount || 0)
    });

    return res.status(201).json({
      success: true,
      message: "Đã thêm tuyến moi.",
      route: mapRoute(route)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể them tuyến."
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { routeNumber, routeName, startPoint, endPoint, operatingVehicleCount, reserveVehicleCount } = req.body;

  try {
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      {
        routeNumber: String(routeNumber).trim(),
        routeName: String(routeName).trim(),
        startPoint: String(startPoint).trim(),
        endPoint: String(endPoint).trim(),
        operatingVehicleCount: Number(operatingVehicleCount || 0),
        reserveVehicleCount: Number(reserveVehicleCount || 0)
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tuyến."
      });
    }

    return res.json({
      success: true,
      message: "Đã cập nhật tuyến.",
      route: mapRoute(route)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể cap nhat tuyến."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tuyến."
      });
    }

    return res.json({
      success: true,
      message: "Đã xóa tuyến."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể xoa tuyến."
    });
  }
});

router.post("/:id/geojson/:direction", requireAdmin, async (req, res) => {
  const { direction } = req.params;
  const { geoJson } = req.body;

  if (!["outbound", "inbound"].includes(direction)) {
    return res.status(400).json({
      success: false,
      message: "Huong lộ trình không hợp lệ."
    });
  }

  try {
    const updateField = direction === "outbound" ? "outboundGeoJson" : "inboundGeoJson";
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { [updateField]: geoJson },
      { new: true }
    );

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tuyến."
      });
    }

    return res.json({
      success: true,
      message: `Đã cập nhật mô phỏng ${direction === "outbound" ? "lượt đi" : "lượt về"}.`,
      route: mapRoute(route)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể cap nhat mô phỏng lộ trình."
    });
  }
});

router.get("/:id/runtime-config", requireAuth, async (req, res) => {
  try {
    const config = await buildRouteRuntimeConfig(req.params.id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay tuyen."
      });
    }

    return res.json({
      success: true,
      config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the tao runtime config cho tuyen."
    });
  }
});

module.exports = router;

