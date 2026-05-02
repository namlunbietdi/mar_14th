const Route = require("../models/Route");
const RouteDirection = require("../models/RouteDirection");
const Stop = require("../models/Stop");

function mapDirectionStops(routeDirectionDoc) {
  const stops = routeDirectionDoc?.stops || [];

  return stops
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      stopId: item.stopId?._id || item.stopId,
      stopCode: item.stopId?.stopCode || "",
      name: item.stopId?.stopName || "",
      lat: item.stopId?.latitude ?? null,
      lon: item.stopId?.longitude ?? null,
      terminal: Boolean(item.isTerminal),
      audio: String(item.stopId?.stopCode || "").trim(),
      order: item.order
    }));
}

async function buildLegacyRouteDirectionFromStops(routeId, direction) {
  const stops = await Stop.find({
    servedRoutes: {
      $elemMatch: {
        routeId,
        [direction === "outbound" ? "outbound" : "inbound"]: true
      }
    }
  }).sort({ stopCode: 1 });

  return stops.map((stop, index) => ({
    stopId: stop._id,
    order: index + 1,
    isTerminal: false,
    audioId: String(stop.stopCode || "")
  }));
}

async function buildRouteRuntimeConfig(routeId) {
  const route = await Route.findById(routeId);

  if (!route) {
    return null;
  }

  let [outboundDirection, inboundDirection] = await Promise.all([
    RouteDirection.findOne({ routeId: route._id, direction: "outbound" }).populate("stops.stopId"),
    RouteDirection.findOne({ routeId: route._id, direction: "inbound" }).populate("stops.stopId")
  ]);

  if (!outboundDirection) {
    const outboundStops = await buildLegacyRouteDirectionFromStops(route._id, "outbound");
    if (outboundStops.length) {
      const stopDocs = await Stop.find({ _id: { $in: outboundStops.map((item) => item.stopId) } });
      const stopMap = new Map(stopDocs.map((stop) => [String(stop._id), stop]));
      outboundDirection = {
        version: 1,
        stops: outboundStops.map((item) => ({ ...item, stopId: stopMap.get(String(item.stopId)) || item.stopId }))
      };
    }
  }

  if (!inboundDirection) {
    const inboundStops = await buildLegacyRouteDirectionFromStops(route._id, "inbound");
    if (inboundStops.length) {
      const stopDocs = await Stop.find({ _id: { $in: inboundStops.map((item) => item.stopId) } });
      const stopMap = new Map(stopDocs.map((stop) => [String(stop._id), stop]));
      inboundDirection = {
        version: 1,
        stops: inboundStops.map((item) => ({ ...item, stopId: stopMap.get(String(item.stopId)) || item.stopId }))
      };
    }
  }

  return {
    version: Math.max(outboundDirection?.version || 1, inboundDirection?.version || 1),
    route: {
      id: route._id,
      routeNumber: route.routeNumber,
      routeName: route.routeName,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      fare: Number(route.fare ?? route.ticketPrice ?? 0)
    },
    routeAudio: {
      outboundStart: `${route.routeNumber}_outbound_start.mp3`,
      inboundStart: `${route.routeNumber}_inbound_start.mp3`,
      outboundEnd: `${route.routeNumber}_outbound_end.mp3`,
      inboundEnd: `${route.routeNumber}_inbound_end.mp3`
    },
    outbound: mapDirectionStops(outboundDirection),
    inbound: mapDirectionStops(inboundDirection)
  };
}

module.exports = {
  buildLegacyRouteDirectionFromStops,
  buildRouteRuntimeConfig
};
