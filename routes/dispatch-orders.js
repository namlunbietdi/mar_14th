const express = require("express");
const Device = require("../models/Device");
const DeviceAssignment = require("../models/DeviceAssignment");
const DispatchOrder = require("../models/DispatchOrder");
const Employee = require("../models/Employee");
const Route = require("../models/Route");
const Vehicle = require("../models/Vehicle");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { getNextDispatchOrderCode, peekNextDispatchOrderCode } = require("../utils/codes");
const { mapDevice, mapDispatchOrder, mapEmployee, mapRoute, mapVehicle } = require("../utils/mappers");
const { deactivateAssignmentsByDispatchOrder, syncDeviceAssignment } = require("../services/device-assignments");

const router = express.Router();

async function populateDispatchOrderQuery(query = {}) {
  return DispatchOrder.find(query)
    .populate("routeId")
    .populate("vehicleId")
    .populate("driverId")
    .populate("conductorId")
    .sort({ plannedStartTime: -1, createdAt: -1 });
}

async function buildDispatchOrdersResponse(query = {}) {
  const [orders, activeAssignments] = await Promise.all([
    populateDispatchOrderQuery(query),
    DeviceAssignment.find({ isActive: true }).populate("deviceId")
  ]);

  const assignmentMap = new Map(
    activeAssignments.map((assignment) => [String(assignment.dispatchOrderId), assignment])
  );

  return orders.map((order) => mapDispatchOrder(order, assignmentMap.get(String(order._id))));
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const query = status ? { status } : {};
    const orders = await buildDispatchOrdersResponse(query);

    return res.json({
      success: true,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the lay danh sach lenh dieu phoi."
    });
  }
});

router.get("/next-code", requireAdmin, async (req, res) => {
  try {
    const orderCode = await peekNextDispatchOrderCode();

    return res.json({
      success: true,
      orderCode
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the tao ma lenh dieu phoi."
    });
  }
});

router.get("/metadata", requireAuth, async (req, res) => {
  try {
    const [routes, vehicles, employees, devices] = await Promise.all([
      Route.find().sort({ routeNumber: 1 }),
      Vehicle.find().populate("vehicleTypeId").sort({ licensePlate: 1 }),
      Employee.find({ status: "working" }).sort({ fullName: 1 }),
      Device.find({ status: "working" }).sort({ deviceId: 1 })
    ]);

    return res.json({
      success: true,
      routes: routes.map(mapRoute),
      vehicles: vehicles.map(mapVehicle),
      employees: employees.map(mapEmployee),
      devices: devices.map(mapDevice)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the tai du lieu phuc vu dieu phoi."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const {
    routeId,
    vehicleId,
    driverId,
    conductorId,
    plannedStartTime,
    plannedEndTime,
    actualStartTime,
    actualEndTime,
    status,
    note,
    deviceRefId,
    assignmentNote
  } = req.body;

  try {
    if (!routeId || !vehicleId || !driverId || !plannedStartTime || !plannedEndTime || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin lenh dieu phoi."
      });
    }

    const orderCode = await getNextDispatchOrderCode();
    const order = await DispatchOrder.create({
      orderCode,
      routeId,
      vehicleId,
      driverId,
      conductorId: conductorId || null,
      plannedStartTime,
      plannedEndTime,
      actualStartTime: actualStartTime || null,
      actualEndTime: actualEndTime || null,
      status,
      note: String(note || "").trim(),
      createdBy: req.currentUser._id
    });

    let activeAssignment = null;

    if (deviceRefId) {
      activeAssignment = await syncDeviceAssignment({
        deviceRefId,
        vehicleId,
        dispatchOrderId: order._id,
        assignedBy: req.currentUser._id,
        note: String(assignmentNote || "").trim(),
        assignedAt: actualStartTime || plannedStartTime || new Date()
      });
    }

    const populatedOrder = await DispatchOrder.findById(order._id)
      .populate("routeId")
      .populate("vehicleId")
      .populate("driverId")
      .populate("conductorId");

    return res.status(201).json({
      success: true,
      message: "Da tao lenh dieu phoi moi.",
      order: mapDispatchOrder(populatedOrder, activeAssignment)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the tao lenh dieu phoi."
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const {
    routeId,
    vehicleId,
    driverId,
    conductorId,
    plannedStartTime,
    plannedEndTime,
    actualStartTime,
    actualEndTime,
    status,
    note,
    deviceRefId,
    assignmentNote
  } = req.body;

  try {
    if (!routeId || !vehicleId || !driverId || !plannedStartTime || !plannedEndTime || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin lenh dieu phoi."
      });
    }

    const order = await DispatchOrder.findByIdAndUpdate(
      req.params.id,
      {
        routeId,
        vehicleId,
        driverId,
        conductorId: conductorId || null,
        plannedStartTime,
        plannedEndTime,
        actualStartTime: actualStartTime || null,
        actualEndTime: actualEndTime || null,
        status,
        note: String(note || "").trim()
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate("routeId")
      .populate("vehicleId")
      .populate("driverId")
      .populate("conductorId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay lenh dieu phoi."
      });
    }

    let activeAssignment = null;

    if (deviceRefId) {
      activeAssignment = await syncDeviceAssignment({
        deviceRefId,
        vehicleId,
        dispatchOrderId: order._id,
        assignedBy: req.currentUser._id,
        note: String(assignmentNote || "").trim(),
        assignedAt: actualStartTime || plannedStartTime || new Date()
      });
    } else {
      await deactivateAssignmentsByDispatchOrder(order._id);
    }

    if (["completed", "cancelled"].includes(status)) {
      await deactivateAssignmentsByDispatchOrder(order._id, actualEndTime || new Date());
      activeAssignment = null;
    }

    return res.json({
      success: true,
      message: "Da cap nhat lenh dieu phoi.",
      order: mapDispatchOrder(order, activeAssignment)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the cap nhat lenh dieu phoi."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const order = await DispatchOrder.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay lenh dieu phoi."
      });
    }

    await deactivateAssignmentsByDispatchOrder(order._id);

    return res.json({
      success: true,
      message: "Da xoa lenh dieu phoi."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the xoa lenh dieu phoi."
    });
  }
});

module.exports = router;
