const monitoringPageMessage = document.getElementById("monitoringPageMessage");
const monitoringTotalCount = document.getElementById("monitoringTotalCount");
const monitoringOnlineCount = document.getElementById("monitoringOnlineCount");
const monitoringOfflineCount = document.getElementById("monitoringOfflineCount");
const refreshMonitoringBtn = document.getElementById("refreshMonitoringBtn");
const monitoringTableBody = document.getElementById("monitoringTableBody");
const selectedMonitoringTitle = document.getElementById("selectedMonitoringTitle");
const selectedMonitoringText = document.getElementById("selectedMonitoringText");

let monitoringSnapshots = [];
let routes = [];
let selectedMonitoringId = "";
let monitoringMarkers = [];
let monitoringRouteLayers = [];

const monitoringMap = L.map("monitoringMap").setView([21.0285, 105.8542], 12);
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
}).addTo(monitoringMap);

function setMonitoringPageMessage(message, type = "") {
  monitoringPageMessage.textContent = message;
  monitoringPageMessage.className = `inline-message ${type}`.trim();
}

function formatDateTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("vi-VN");
}

function getMonitoringStatusLabel(status) {
  return status === "online" ? "Online" : "Offline";
}

function renderMonitoringSummary(summary) {
  monitoringTotalCount.textContent = summary.total || 0;
  monitoringOnlineCount.textContent = summary.online || 0;
  monitoringOfflineCount.textContent = summary.offline || 0;
}

function getRouteById(routeId) {
  return routes.find((route) => route.id === routeId) || null;
}

function clearMonitoringMap() {
  monitoringMarkers.forEach((marker) => monitoringMap.removeLayer(marker));
  monitoringRouteLayers.forEach((layer) => monitoringMap.removeLayer(layer));
  monitoringMarkers = [];
  monitoringRouteLayers = [];
}

function buildBoundsFromLayers(layers) {
  if (!layers.length) {
    return null;
  }

  let bounds = null;

  layers.forEach((layer) => {
    if (layer.getBounds) {
      bounds = bounds ? bounds.extend(layer.getBounds()) : layer.getBounds();
      return;
    }

    if (layer.getLatLng) {
      const latLng = layer.getLatLng();
      bounds = bounds ? bounds.extend(latLng) : L.latLngBounds([latLng]);
    }
  });

  return bounds;
}

function renderMonitoringMap() {
  clearMonitoringMap();

  const visibleSnapshots = selectedMonitoringId
    ? monitoringSnapshots.filter((item) => item.id === selectedMonitoringId)
    : monitoringSnapshots;

  if (!visibleSnapshots.length) {
    selectedMonitoringTitle.textContent = "Tat ca phương tiện";
    selectedMonitoringText.textContent = "Ban do dang hien thi tat ca phương tiện co tin hieu GPS gan nhat.";
    return;
  }

  const layersForBounds = [];

  visibleSnapshots.forEach((item) => {
    if (item.latitude === null || item.longitude === null) {
      return;
    }

    const marker = L.circleMarker([item.latitude, item.longitude], {
      radius: item.id === selectedMonitoringId ? 10 : 8,
      color: item.connectionStatus === "online" ? "#1565c0" : "#c62828",
      fillColor: item.connectionStatus === "online" ? "#4fc3f7" : "#ef5350",
      fillOpacity: 0.92,
      weight: 2
    }).addTo(monitoringMap);

    marker.bindPopup(`
      <strong>${item.licensePlate || item.deviceId}</strong><br>
      Thiết bị: ${item.deviceId}<br>
      Tuyến: ${item.routeNumber ? `${item.routeNumber} - ${item.routeName}` : "Chưa co lenh"}<br>
      Toc do: ${item.speed || 0} km/h<br>
      Lan nhan cuoi: ${formatDateTime(item.lastReceivedAt)}
    `);

    monitoringMarkers.push(marker);
    layersForBounds.push(marker);

    if (item.id === selectedMonitoringId) {
      marker.openPopup();
    }
  });

  const selectedSnapshot = monitoringSnapshots.find((item) => item.id === selectedMonitoringId) || null;
  const selectedRoute = selectedSnapshot ? getRouteById(selectedSnapshot.routeId) : null;

  if (selectedSnapshot) {
    selectedMonitoringTitle.textContent = `${selectedSnapshot.licensePlate || "Chưa gan xe"} | ${selectedSnapshot.deviceId}`;
    selectedMonitoringText.textContent = selectedSnapshot.routeNumber
      ? `Tuyến ${selectedSnapshot.routeNumber} - ${selectedSnapshot.routeName} | Toc do ${selectedSnapshot.speed || 0} km/h | Cap nhat ${formatDateTime(selectedSnapshot.lastReceivedAt)}`
      : `Chưa gan lenh/tuyến | Toc do ${selectedSnapshot.speed || 0} km/h | Cap nhat ${formatDateTime(selectedSnapshot.lastReceivedAt)}`;

    if (selectedRoute?.outboundGeoJson) {
      const outboundLayer = L.geoJSON(selectedRoute.outboundGeoJson, {
        style: { color: "#1565c0", weight: 5, opacity: 0.78 }
      }).addTo(monitoringMap);
      monitoringRouteLayers.push(outboundLayer);
      layersForBounds.push(outboundLayer);
    }

    if (selectedRoute?.inboundGeoJson) {
      const inboundLayer = L.geoJSON(selectedRoute.inboundGeoJson, {
        style: { color: "#d62828", weight: 5, opacity: 0.78 }
      }).addTo(monitoringMap);
      monitoringRouteLayers.push(inboundLayer);
      layersForBounds.push(inboundLayer);
    }
  } else {
    selectedMonitoringTitle.textContent = "Tat ca phương tiện";
    selectedMonitoringText.textContent = "Ban do dang hien thi tat ca phương tiện co tin hieu GPS gan nhat.";
  }

  const bounds = buildBoundsFromLayers(layersForBounds);
  if (bounds && bounds.isValid()) {
    monitoringMap.fitBounds(bounds, { padding: [20, 20] });
  }
}

function renderMonitoringTable() {
  if (!monitoringSnapshots.length) {
    monitoringTableBody.innerHTML = `<tr><td colspan="6">Chưa co phương tiện nao dang gui GPS.</td></tr>`;
    renderMonitoringMap();
    return;
  }

  monitoringTableBody.innerHTML = monitoringSnapshots
    .map((item) => `
      <tr class="${item.id === selectedMonitoringId ? "selected-row" : ""}" data-monitoring-id="${item.id}">
        <td>${item.licensePlate || '<span class="muted-text">Chưa gan xe</span>'}</td>
        <td>${item.deviceId}</td>
        <td>${item.routeNumber ? `${item.routeNumber} - ${item.routeName}` : '<span class="muted-text">Chưa co lenh</span>'}</td>
        <td>${item.speed || 0} km/h</td>
        <td>${formatDateTime(item.lastReceivedAt)}</td>
        <td><span class="status-badge ${item.connectionStatus === "online" ? "working" : "left"}">${getMonitoringStatusLabel(item.connectionStatus)}</span></td>
      </tr>
    `)
    .join("");

  renderMonitoringMap();
}

async function loadRoutesForMonitoring() {
  const response = await window.busApp.authFetch("/api/routes");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể tai danh sach tuyến.");
  }

  routes = data.routes;
}

async function loadMonitoringLiveData(showSuccessMessage = false) {
  const response = await window.busApp.authFetch("/api/monitoring/live");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể tai du lieu giám sát trực tiếp.");
  }

  monitoringSnapshots = data.items;
  renderMonitoringSummary(data.summary || {});

  if (selectedMonitoringId && !monitoringSnapshots.some((item) => item.id === selectedMonitoringId)) {
    selectedMonitoringId = "";
  }

  renderMonitoringTable();

  if (showSuccessMessage) {
    setMonitoringPageMessage(`Đã tải ${monitoringSnapshots.length} phương tiện co GPS.`, "success");
  }
}

async function loadMonitoringPage(showSuccessMessage = true) {
  setMonitoringPageMessage("Đang tải du lieu giám sát...");

  try {
    await loadRoutesForMonitoring();
    await loadMonitoringLiveData(false);

    if (showSuccessMessage) {
      setMonitoringPageMessage(`Đã tải ${monitoringSnapshots.length} phương tiện co GPS.`, "success");
    }
  } catch (error) {
    monitoringTableBody.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
    setMonitoringPageMessage(error.message, "error");
  }
}

refreshMonitoringBtn?.addEventListener("click", () => loadMonitoringPage(true));

monitoringTableBody?.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-monitoring-id]");

  if (!row) {
    return;
  }

  selectedMonitoringId = row.dataset.monitoringId;
  renderMonitoringTable();
});

loadMonitoringPage();
const MONITORING_REFRESH_INTERVAL_MS = 3000;
setInterval(() => {
  loadMonitoringLiveData(false).catch((error) => {
    setMonitoringPageMessage(error.message, "error");
  });
}, MONITORING_REFRESH_INTERVAL_MS);

