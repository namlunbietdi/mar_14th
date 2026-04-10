function mapUser(user) {
  return {
    id: user._id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    position: user.position,
    createdAt: user.createdAt
  };
}

function mapEmployee(employee) {
  return {
    id: employee._id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    birthDate: employee.birthDate,
    position: employee.position,
    status: employee.status,
    createdAt: employee.createdAt
  };
}

function calculateExpiryDate(operationStartDate) {
  const expiryDate = new Date(operationStartDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 10);
  return expiryDate;
}

function calculateDeviceExpiryDate(operationStartDate) {
  const expiryDate = new Date(operationStartDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 3);
  return expiryDate;
}

function calculateNextMaintenanceDate(createdAt) {
  const nextMaintenanceDate = new Date(createdAt);
  nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + 7);
  return nextMaintenanceDate;
}

function calculateRemainingServiceLife(operationStartDate) {
  const expiryDate = calculateDeviceExpiryDate(operationStartDate);
  const now = new Date();
  const diffInMs = expiryDate.getTime() - now.getTime();

  if (diffInMs <= 0) {
    return {
      expiryDate,
      remainingDays: 0,
      remainingLabel: "Het nien han"
    };
  }

  const remainingDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(remainingDays / 365);
  const months = Math.floor((remainingDays % 365) / 30);
  const days = remainingDays - years * 365 - months * 30;
  const parts = [];

  if (years > 0) parts.push(`${years} nam`);
  if (months > 0) parts.push(`${months} thang`);
  if (days > 0 || !parts.length) parts.push(`${days} ngay`);

  return {
    expiryDate,
    remainingDays,
    remainingLabel: parts.join(" ")
  };
}

function mapVehicleType(vehicleType) {
  return {
    id: vehicleType._id,
    brand: vehicleType.brand,
    modelName: vehicleType.modelName,
    capacity: vehicleType.capacity,
    createdAt: vehicleType.createdAt
  };
}

function mapVehicle(vehicle) {
  const operationStartDate = new Date(vehicle.operationStartDate);
  const expiryDate = calculateExpiryDate(operationStartDate);

  return {
    id: vehicle._id,
    licensePlate: vehicle.licensePlate,
    brand: vehicle.vehicleTypeId.brand,
    modelName: vehicle.vehicleTypeId.modelName,
    capacity: vehicle.vehicleTypeId.capacity,
    operationStartDate,
    expiryDate,
    status: vehicle.status,
    vehicleTypeId: vehicle.vehicleTypeId._id
  };
}

function mapDevice(device) {
  const operationStartDate = new Date(device.operationStartDate);
  const createdAt = new Date(device.createdAt);
  const { expiryDate, remainingDays, remainingLabel } = calculateRemainingServiceLife(operationStartDate);
  const nextMaintenanceDate = calculateNextMaintenanceDate(createdAt);

  return {
    id: device._id,
    deviceId: device.deviceId,
    operationStartDate,
    createdAt,
    expiryDate,
    remainingDays,
    remainingLabel,
    nextMaintenanceDate,
    status: device.status
  };
}

function mapDispatchOrder(order, activeAssignment = null) {
  return {
    id: order._id,
    orderCode: order.orderCode,
    routeId: order.routeId?._id || order.routeId,
    routeNumber: order.routeId?.routeNumber || "",
    routeName: order.routeId?.routeName || "",
    vehicleId: order.vehicleId?._id || order.vehicleId,
    licensePlate: order.vehicleId?.licensePlate || "",
    driverId: order.driverId?._id || order.driverId,
    driverName: order.driverId?.fullName || "",
    conductorId: order.conductorId?._id || order.conductorId || null,
    conductorName: order.conductorId?.fullName || "",
    plannedStartTime: order.plannedStartTime,
    plannedEndTime: order.plannedEndTime,
    actualStartTime: order.actualStartTime,
    actualEndTime: order.actualEndTime,
    status: order.status,
    note: order.note || "",
    deviceAssignmentId: activeAssignment?._id || null,
    deviceId: activeAssignment?.deviceId?.deviceId || "",
    assignmentNote: activeAssignment?.note || "",
    assignedAt: activeAssignment?.assignedAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

function mapMonitoringSnapshot(lastState, offlineThresholdInSeconds = 120) {
  const lastReceivedAt = lastState.lastReceivedAt ? new Date(lastState.lastReceivedAt) : null;
  const now = Date.now();
  const isOffline = !lastReceivedAt || now - lastReceivedAt.getTime() > offlineThresholdInSeconds * 1000;

  return {
    id: lastState._id,
    deviceRefId: lastState.deviceId?._id || lastState.deviceId || null,
    deviceId: lastState.deviceCode,
    vehicleId: lastState.vehicleId?._id || lastState.vehicleId || null,
    licensePlate: lastState.vehicleId?.licensePlate || "",
    dispatchOrderId: lastState.dispatchOrderId?._id || lastState.dispatchOrderId || null,
    orderCode: lastState.dispatchOrderId?.orderCode || "",
    routeId: lastState.dispatchOrderId?.routeId?._id || lastState.dispatchOrderId?.routeId || null,
    routeNumber: lastState.dispatchOrderId?.routeId?.routeNumber || "",
    routeName: lastState.dispatchOrderId?.routeId?.routeName || "",
    latitude: lastState.latitude,
    longitude: lastState.longitude,
    speed: lastState.speed,
    heading: lastState.heading,
    ignition: lastState.ignition,
    lastGpsTime: lastState.lastGpsTime,
    lastReceivedAt,
    connectionStatus: isOffline ? "offline" : "online"
  };
}

function mapLocationLog(locationLog) {
  return {
    id: locationLog._id,
    deviceId: locationLog.deviceCode,
    vehicleId: locationLog.vehicleId?._id || locationLog.vehicleId || null,
    licensePlate: locationLog.vehicleId?.licensePlate || "",
    dispatchOrderId: locationLog.dispatchOrderId?._id || locationLog.dispatchOrderId || null,
    orderCode: locationLog.dispatchOrderId?.orderCode || "",
    latitude: locationLog.latitude,
    longitude: locationLog.longitude,
    speed: locationLog.speed,
    heading: locationLog.heading,
    ignition: locationLog.ignition,
    gpsTime: locationLog.gpsTime,
    receivedAt: locationLog.receivedAt,
    topic: locationLog.topic
  };
}

function mapRoute(route) {
  return {
    id: route._id,
    routeNumber: route.routeNumber,
    routeName: route.routeName,
    startPoint: route.startPoint,
    endPoint: route.endPoint,
    operatingVehicleCount: route.operatingVehicleCount,
    reserveVehicleCount: route.reserveVehicleCount,
    totalVehicleCount: route.operatingVehicleCount + route.reserveVehicleCount,
    outboundGeoJson: route.outboundGeoJson,
    inboundGeoJson: route.inboundGeoJson,
    createdAt: route.createdAt
  };
}

function mapStop(stop) {
  const servedRoutes = Array.isArray(stop.servedRoutes) && stop.servedRoutes.length
    ? stop.servedRoutes
        .filter((item) => item.routeId)
        .map((item) => ({
          routeId: item.routeId._id || item.routeId,
          routeNumber: item.routeId.routeNumber || "",
          routeName: item.routeId.routeName || "",
          outbound: Boolean(item.outbound),
          inbound: Boolean(item.inbound)
        }))
    : (stop.routeIds || []).map((route) => ({
        routeId: route._id || route,
        routeNumber: route.routeNumber || "",
        routeName: route.routeName || "",
        outbound: true,
        inbound: true
      }));

  const routeDisplay = servedRoutes.flatMap((item) => {
    const labels = [];
    if (item.outbound) labels.push(`${item.routeNumber} (di)`);
    if (item.inbound) labels.push(`${item.routeNumber} (ve)`);
    return labels;
  });

  return {
    id: stop._id,
    stopCode: stop.stopCode,
    stopName: stop.stopName,
    longitude: stop.longitude,
    latitude: stop.latitude,
    servedRoutes,
    routeIds: servedRoutes.map((item) => item.routeId),
    routeNumbers: routeDisplay,
    isEndpoint: stop.isEndpoint,
    createdAt: stop.createdAt
  };
}

module.exports = {
  calculateDeviceExpiryDate,
  calculateExpiryDate,
  calculateNextMaintenanceDate,
  calculateRemainingServiceLife,
  mapDevice,
  mapDispatchOrder,
  mapEmployee,
  mapLocationLog,
  mapMonitoringSnapshot,
  mapRoute,
  mapStop,
  mapUser,
  mapVehicle,
  mapVehicleType
};
