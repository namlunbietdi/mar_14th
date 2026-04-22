const DeviceAssignment = require("../models/DeviceAssignment");

async function deactivateAssignments(filter, unassignedAt = new Date(), session = null) {
  await DeviceAssignment.updateMany(
    {
      ...filter,
      isActive: true
    },
    {
      isActive: false,
      unassignedAt
    },
    session ? { session } : undefined
  );
}

async function syncDeviceAssignment({
  deviceRefId,
  vehicleId,
  dispatchOrderId,
  assignedBy,
  note = "",
  assignedAt = new Date(),
  session = null
}) {
  if (!deviceRefId || !vehicleId || !dispatchOrderId || !assignedBy) {
    return null;
  }

  const conflictingAssignment = await DeviceAssignment.findOne({
    deviceId: deviceRefId,
    isActive: true,
    dispatchOrderId: { $ne: dispatchOrderId }
  }).session(session);

  if (conflictingAssignment) {
    throw new Error("Thiet bi dang duoc gan cho lenh dieu phoi khac.");
  }

  const existingAssignment = await DeviceAssignment.findOne({
    deviceId: deviceRefId,
    vehicleId,
    dispatchOrderId,
    isActive: true
  })
    .session(session)
    .populate("deviceId");

  if (existingAssignment) {
    if (existingAssignment.note !== note) {
      existingAssignment.note = note;
      await existingAssignment.save({ session });
    }

    return existingAssignment;
  }

  await deactivateAssignments({
    $or: [
      { deviceId: deviceRefId },
      { vehicleId },
      { dispatchOrderId }
    ]
  }, assignedAt, session);

  const createdAssignments = await DeviceAssignment.create(
    [{
      deviceId: deviceRefId,
      vehicleId,
      dispatchOrderId,
      assignedBy,
      note,
      assignedAt,
      isActive: true
    }],
    session ? { session } : undefined
  );
  const assignmentId = createdAssignments[0]._id;

  return DeviceAssignment.findById(assignmentId)
    .session(session)
    .populate("deviceId");
}

async function deactivateAssignmentsByDispatchOrder(dispatchOrderId, unassignedAt = new Date(), session = null) {
  if (!dispatchOrderId) {
    return;
  }

  await deactivateAssignments({ dispatchOrderId }, unassignedAt, session);
}

module.exports = {
  deactivateAssignmentsByDispatchOrder,
  syncDeviceAssignment
};
