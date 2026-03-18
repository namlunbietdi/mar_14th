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
  calculateExpiryDate,
  mapEmployee,
  mapRoute,
  mapStop,
  mapUser,
  mapVehicle,
  mapVehicleType
};
