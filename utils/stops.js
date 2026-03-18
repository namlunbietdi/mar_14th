function normalizeStopServedRoutes(servedRoutes) {
  if (!Array.isArray(servedRoutes)) {
    return [];
  }

  return servedRoutes
    .map((item) => ({
      routeId: item.routeId,
      outbound: Boolean(item.outbound),
      inbound: Boolean(item.inbound)
    }))
    .filter((item) => item.routeId && (item.outbound || item.inbound));
}

module.exports = {
  normalizeStopServedRoutes
};
