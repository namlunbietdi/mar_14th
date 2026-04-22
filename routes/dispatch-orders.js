const express = require("express");
const mongoose = require("mongoose");
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

function isValidDateValue(value) {
  if (!value) return false;
  const parsedDate = new Date(value);
  return !Number.isNaN(parsedDate.getTime());
}

function validateDispatchPayload(payload) {
  const {
    routeId,
    vehicleId,
    driverId,
    plannedStartTime,
    plannedEndTime,
    actualStartTime,
    actualEndTime,
    status,
    deviceRefId
  } = payload;

  if (!routeId || !vehicleId || !driverId || !plannedStartTime || !plannedEndTime || !status) {
    return "Vui long nhap day du thong tin lenh dieu phoi.";
  }

  if (!isValidDateValue(plannedStartTime) || !isValidDateValue(plannedEndTime)) {
    return "Thoi gian ke hoach khong hop le.";
  }

  if (new Date(plannedEndTime).getTime() < new Date(plannedStartTime).getTime()) {
    return "Thoi gian ket thuc ke hoach phai lon hon hoac bang thoi gian bat dau.";
  }

  if (actualStartTime && !isValidDateValue(actualStartTime)) {
    return "Thoi gian bat dau thuc te khong hop le.";
  }

  if (actualEndTime && !isValidDateValue(actualEndTime)) {
    return "Thoi gian ket thuc thuc te khong hop le.";
  }

  if (actualStartTime && actualEndTime && new Date(actualEndTime).getTime() < new Date(actualStartTime).getTime()) {
    return "Thoi gian ket thuc thuc te phai lon hon hoac bang thoi gian bat dau thuc te.";
  }

  if (status === "running" && !deviceRefId) {
    return "Lenh dang chay bat buoc phai gan thiet bi.";
  }

  return null;
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
    const [routes, vehicles, employees, devices, activeAssignments] = await Promise.all([
      Route.find().sort({ routeNumber: 1 }),
      Vehicle.find().populate("vehicleTypeId").sort({ licensePlate: 1 }),
      Employee.find({ status: "working" }).sort({ fullName: 1 }),
      Device.find({ status: "working" }).sort({ deviceId: 1 }),
      DeviceAssignment.find({ isActive: true }).select("deviceId dispatchOrderId")
    ]);

    const assignmentMap = new Map(
      activeAssignments.map((item) => [
        String(item.deviceId),
        {
          assignmentId: String(item._id),
          dispatchOrderId: item.dispatchOrderId ? String(item.dispatchOrderId) : null
        }
      ])
    );

    return res.json({
      success: true,
      routes: routes.map(mapRoute),
      vehicles: vehicles.map(mapVehicle),
      employees: employees.map(mapEmployee),
      devices: devices.map((device) => {
        const mappedDevice = mapDevice(device);
        const activeAssignment = assignmentMap.get(String(device._id)) || null;

        return {
          ...mappedDevice,
          isAssigned: Boolean(activeAssignment),
          assignedDispatchOrderId: activeAssignment?.dispatchOrderId || null
        };
      })
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
    const validationMessage = validateDispatchPayload(req.body);
    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage
      });
    }

    const orderCode = await getNextDispatchOrderCode();
    const session = await mongoose.startSession();
    let activeAssignment = null;
    let populatedOrder = null;

    try {
      await session.withTransaction(async () => {
        const createdOrders = await DispatchOrder.create(
          [{
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
          }],
          { session }
        );
        const order = createdOrders[0];

        if (deviceRefId) {
          activeAssignment = await syncDeviceAssignment({
            deviceRefId,
            vehicleId,
            dispatchOrderId: order._id,
            assignedBy: req.currentUser._id,
            note: String(assignmentNote || "").trim(),
            assignedAt: actualStartTime || plannedStartTime || new Date(),
            session
          });
        }

        populatedOrder = await DispatchOrder.findById(order._id)
          .session(session)
          .populate("routeId")
          .populate("vehicleId")
          .populate("driverId")
          .populate("conductorId");
      });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      success: true,
      message: "Da tao lenh dieu phoi moi.",
      order: mapDispatchOrder(populatedOrder, activeAssignment)
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Khong the tao lenh dieu phoi."
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
    const validationMessage = validateDispatchPayload(req.body);
    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage
      });
    }

    const session = await mongoose.startSession();
    let activeAssignment = null;
    let order = null;

    try {
      await session.withTransaction(async () => {
        order = await DispatchOrder.findByIdAndUpdate(
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
            runValidators: true,
            session
          }
        )
          .populate("routeId")
          .populate("vehicleId")
          .populate("driverId")
          .populate("conductorId");

        if (!order) {
          throw new Error("NOT_FOUND");
        }

        if (deviceRefId) {
          activeAssignment = await syncDeviceAssignment({
            deviceRefId,
            vehicleId,
            dispatchOrderId: order._id,
            assignedBy: req.currentUser._id,
            note: String(assignmentNote || "").trim(),
            assignedAt: actualStartTime || plannedStartTime || new Date(),
            session
          });
        } else {
          await deactivateAssignmentsByDispatchOrder(order._id, new Date(), session);
        }

        if (["completed", "cancelled"].includes(status)) {
          await deactivateAssignmentsByDispatchOrder(order._id, actualEndTime || new Date(), session);
          activeAssignment = null;
        }
      });
    } finally {
      await session.endSession();
    }

    return res.json({
      success: true,
      message: "Da cap nhat lenh dieu phoi.",
      order: mapDispatchOrder(order, activeAssignment)
    });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay lenh dieu phoi."
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Khong the cap nhat lenh dieu phoi."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const order = await DispatchOrder.findByIdAndDelete(req.params.id).session(session);

        if (!order) {
          throw new Error("NOT_FOUND");
        }

        await deactivateAssignmentsByDispatchOrder(order._id, new Date(), session);
      });
    } finally {
      await session.endSession();
    }

    return res.json({
      success: true,
      message: "Da xoa lenh dieu phoi."
    });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay lenh dieu phoi."
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Khong the xoa lenh dieu phoi."
    });
  }
});

module.exports = router;
