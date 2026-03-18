const express = require("express");
const Route = require("../models/Route");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapRoute } = require("../utils/mappers");

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
      message: "Khong the lay danh sach tuyen."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { routeNumber, routeName, startPoint, endPoint, operatingVehicleCount, reserveVehicleCount } = req.body;

  try {
    if (!routeNumber || !routeName || !startPoint || !endPoint) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin tuyen."
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
      message: "Da them tuyen moi.",
      route: mapRoute(route)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the them tuyen."
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
        message: "Khong tim thay tuyen."
      });
    }

    return res.json({
      success: true,
      message: "Da cap nhat tuyen.",
      route: mapRoute(route)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the cap nhat tuyen."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay tuyen."
      });
    }

    return res.json({
      success: true,
      message: "Da xoa tuyen."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the xoa tuyen."
    });
  }
});

router.post("/:id/geojson/:direction", requireAdmin, async (req, res) => {
  const { direction } = req.params;
  const { geoJson } = req.body;

  if (!["outbound", "inbound"].includes(direction)) {
    return res.status(400).json({
      success: false,
      message: "Huong lo trinh khong hop le."
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
        message: "Khong tim thay tuyen."
      });
    }

    return res.json({
      success: true,
      message: `Da cap nhat mo phong ${direction === "outbound" ? "luot di" : "luot ve"}.`,
      route: mapRoute(route)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the cap nhat mo phong lo trinh."
    });
  }
});

module.exports = router;
