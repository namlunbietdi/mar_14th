const DeviceAssignment = require("../models/DeviceAssignment");

async function deactivateAssignments(filter, unassignedAt = new Date()) {
  await DeviceAssignment.updateMany(
    {
      ...filter,
      isActive: true
    },
    {
      isActive: false,
      unassignedAt
    }
  );
}

async function syncDeviceAssignment({
  deviceRefId,
  vehicleId,
  dispatchOrderId,
  assignedBy,
  note = "",
  assignedAt = new Date()
}) {
  if (!deviceRefId || !vehicleId || !dispatchOrderId || !assignedBy) {
    return null;
  }

  const existingAssignment = await DeviceAssignment.findOne({
    deviceId: deviceRefId,
    vehicleId,
    dispatchOrderId,
    isActive: true
  }).populate("deviceId");

  if (existingAssignment) {
    if (existingAssignment.note !== note) {
      existingAssignment.note = note;
      await existingAssignment.save();
    }

    return existingAssignment;
  }

  await deactivateAssignments({
    $or: [
      { deviceId: deviceRefId },
      { vehicleId },
      { dispatchOrderId }
    ]
  }, assignedAt);

  const assignment = await DeviceAssignment.create({
    deviceId: deviceRefId,
    vehicleId,
    dispatchOrderId,
    assignedBy,
    note,
    assignedAt,
    isActive: true
  });

  return DeviceAssignment.findById(assignment._id).populate("deviceId");
}

async function deactivateAssignmentsByDispatchOrder(dispatchOrderId, unassignedAt = new Date()) {
  if (!dispatchOrderId) {
    return;
  }

  await deactivateAssignments({ dispatchOrderId }, unassignedAt);
}

module.exports = {
  deactivateAssignmentsByDispatchOrder,
  syncDeviceAssignment
};
